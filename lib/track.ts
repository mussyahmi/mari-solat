import { auth, db } from '@/firebase';
import { addDoc, collection, Timestamp } from 'firebase/firestore';

function getOrCreateUUID(): string {
  let uid = localStorage.getItem('msolat_uid');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('msolat_uid', uid);
  }
  return uid;
}

/**
 * Koordinat disimpan tepat seperti yang diberikan oleh peranti, tanpa
 * pembundaran.
 *
 * Ini keputusan yang disengajakan dan bukan terlepas pandang. Ketepatan penuh
 * bermakna setiap baris boleh menunjuk ke lokasi sebenar seseorang, jadi ia
 * bergantung sepenuhnya pada bacaan koleksi ini kekal tertutup: lihat
 * firestore.rules, di mana `allow read: if false`, dan /api/pantau yang
 * menyaring melalui senarai putih ADMIN_UIDS.
 *
 * Jika bacaan awam pernah dibuka semula, atau data ini dieksport ke tempat
 * lain, ketepatan ini mesti diturunkan dahulu.
 */

const kunciHari = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const KUNCI_HARI = 'msolat_last_tracked_day';
const KUNCI_KOORDINAT = 'msolat_last_tracked_coords';

/**
 * Rekod lawatan hari ini sebagai satu peristiwa baharu.
 *
 * Dahulunya `setDoc(doc(db,'visits',uuid))` — satu dokumen bagi setiap
 * peranti, ditimpa setiap kali. Itu menjadikan koleksi ini jadual "kali
 * terakhir dilihat" dan bukan log: pertumbuhan mengikut minggu, pengguna
 * baharu berbanding berulang, dan pengekalan semuanya mustahil dijawab
 * kerana sejarahnya tidak pernah disimpan. Kini `addDoc`, dengan uuid
 * sebagai medan.
 *
 * Masih sekali sehari bagi setiap peranti — itu memberi sejarah harian yang
 * berguna tanpa satu baris bagi setiap muat halaman.
 *
 * Koordinat pilihan. Zon sahaja sudah memadai untuk merekod lawatan;
 * koordinat menyusul apabila ia memang tersedia.
 */
export function trackVisit(zone: string, koordinat?: { lat: number; lng: number }) {
  // Semakan localStorage di bawah dan penulisannya dipisahkan oleh await
  // addDoc. Halaman utama dan AkaunProvider memanggil fungsi ini serentak
  // semasa muat, jadi kedua-duanya lulus semakan sebelum salah satu sempat
  // menulis — satu lawatan menjadi dua baris dalam saat yang sama. Beratur
  // memastikan setiap panggilan menyemak selepas yang sebelumnya selesai.
  const giliran = antrian.then(() => tulisLawatan(zone, koordinat));
  antrian = giliran;
  return giliran;
}

let antrian: Promise<void> = Promise.resolve();

async function tulisLawatan(zone: string, koordinat?: { lat: number; lng: number }) {
  // UUID hanyalah profil pelayar: aplikasi yang dipasang, tetingkap peribadi
  // dan pemadaman ITP Safari semuanya menghasilkan yang baharu, jadi satu
  // orang boleh muncul beberapa kali dan tidak pernah boleh dipadankan
  // merentas peranti. UID Firebase kekal merentas kesemuanya — tetapi hanya
  // wujud untuk pengguna yang log masuk, jadi ia medan pilihan.
  const uid = auth.currentUser?.uid;
  const hariIni = kunciHari();
  const sudahHariIni = localStorage.getItem(KUNCI_HARI) === hariIni;
  const koordinatHariIni = localStorage.getItem(KUNCI_KOORDINAT) === hariIni;

  // Tulis sekali sehari, kecuali apabila koordinat tiba selepas baris hari ini
  // sudah ditulis tanpanya — baris itu berbaloi dinaik taraf.
  if (sudahHariIni && (!koordinat || koordinatHariIni)) return;

  try {
    const uuid = getOrCreateUUID();
    await addDoc(collection(db, 'visits'), {
      uuid,
      zone,
      timestamp: Timestamp.now(),
      ua: navigator.userAgent.slice(0, 400),
      ...(uid ? { uid } : {}),
      ...(koordinat ? { lat: koordinat.lat, lng: koordinat.lng } : {}),
    });
    localStorage.setItem(KUNCI_HARI, hariIni);
    if (koordinat) localStorage.setItem(KUNCI_KOORDINAT, hariIni);
  } catch { /* senyap */ }
}

/**
 * Rekod lawatan tanpa sekali-kali meminta kebenaran lokasi.
 *
 * Dipanggil dari AkaunProvider selepas keadaan auth diketahui — dipanggil
 * lebih awal, auth.currentUser masih null walaupun bagi pengguna yang log
 * masuk, jadi uid tidak akan pernah dirakam.
 * Koordinat hanya diambil jika kebenaran sudah diberi sebelum ini — gesaan
 * lokasi pada setiap muat halaman ialah harga yang terlalu mahal untuk satu
 * baris analitik.
 */
export async function trackVisitSenyap() {
  const zone = localStorage.getItem('msolat_zone_code') ?? '';
  if (localStorage.getItem(KUNCI_HARI) === kunciHari()) return;

  let koordinat: { lat: number; lng: number } | undefined;
  try {
    const izin = await navigator.permissions?.query({ name: 'geolocation' });
    if (izin?.state === 'granted') {
      koordinat = await new Promise((selesai, gagal) =>
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => selesai({ lat: coords.latitude, lng: coords.longitude }),
          gagal,
          { timeout: 8000 }
        )
      );
    }
  } catch { /* tiada kebenaran, tiada koordinat — lawatan tetap direkod */ }

  await trackVisit(zone, koordinat);
}

export type Visit = {
  uuid: string;
  /** UID Firebase, jika pelawat log masuk. */
  uid: string;
  lat: string;
  lng: string;
  zone: string;
  timestamp: string;
  ua: string;
};

/**
 * Koleksi ini tidak lagi boleh dibaca dari klien — lihat firestore.rules.
 * Ia datang melalui laluan pelayan yang mengesahkan token ID pemanggil.
 */
export async function fetchVisits(idToken: string): Promise<Visit[]> {
  // Bukan header Authorization. Cloud Run menganggap "Authorization: Bearer"
  // sebagai token IAM Google, cuba mengesahkannya sebagai token itu, dan
  // menolak permintaan dengan 401 sebelum bekas kita melihatnya — jadi token
  // ID Firebase tidak pernah sampai ke laluan ini.
  const res = await fetch('/api/pantau', {
    headers: { 'X-Id-Token': idToken },
  });
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'tidak-dibenarkan' : 'gagal');
  }
  return res.json();
}
