import { db } from '@/firebase';
import { doc, setDoc, Timestamp } from 'firebase/firestore';

function getOrCreateUUID(): string {
  let uid = localStorage.getItem('msolat_uid');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('msolat_uid', uid);
  }
  return uid;
}

/**
 * Ketepatan yang disimpan.
 *
 * Empat tempat perpuluhan ≈ 11 meter. Ini keputusan yang disengajakan: peta
 * pelawat kehilangan butiran sebenar pada dua tempat perpuluhan (≈ 1.1 km),
 * yang menjadikan setiap orang dalam satu kejiranan bertindih menjadi satu
 * titik.
 *
 * Ketepatan itu hanya boleh diterima kerana bacaan koleksi ini kini ditutup
 * sepenuhnya (lihat firestore.rules) dan hanya boleh dicapai melalui
 * /api/pantau dengan UID pentadbir. Jika bacaan awam pernah dibuka semula,
 * ini mesti turun semula.
 */
const bulatkan = (n: number) => Math.round(n * 10000) / 10000;

const kunciHari = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

const KUNCI_HARI = 'msolat_last_tracked_day';
const KUNCI_KOORDINAT = 'msolat_last_tracked_coords';

/**
 * Rekod lawatan hari ini.
 *
 * Koordinat pilihan. Dahulunya ini hanya dipanggil dari dalam panggil balik
 * kejayaan geolokasi pada halaman utama, jadi sesiapa yang menolak lokasi,
 * memilih zon sendiri, atau mendarat terus pada mana-mana halaman lain tidak
 * pernah dikira langsung — setiap nombor pada /pantau ialah lantai, bukan
 * jumlah. Zon sahaja sudah memadai untuk merekod lawatan; koordinat menyusul
 * apabila ia memang tersedia.
 */
export async function trackVisit(zone: string, koordinat?: { lat: number; lng: number }) {
  const hariIni = kunciHari();
  const sudahHariIni = localStorage.getItem(KUNCI_HARI) === hariIni;
  const koordinatHariIni = localStorage.getItem(KUNCI_KOORDINAT) === hariIni;

  // Tulis sekali sehari, kecuali apabila koordinat tiba selepas baris hari ini
  // sudah ditulis tanpanya — baris itu berbaloi dinaik taraf.
  if (sudahHariIni && (!koordinat || koordinatHariIni)) return;

  try {
    const uuid = getOrCreateUUID();
    await setDoc(doc(db, 'visits', uuid), {
      uuid,
      zone,
      timestamp: Timestamp.now(),
      ua: navigator.userAgent.slice(0, 400),
      ...(koordinat
        ? { lat: bulatkan(koordinat.lat), lng: bulatkan(koordinat.lng) }
        : {}),
    });
    localStorage.setItem(KUNCI_HARI, hariIni);
    if (koordinat) localStorage.setItem(KUNCI_KOORDINAT, hariIni);
  } catch { /* senyap */ }
}

/**
 * Rekod lawatan tanpa sekali-kali meminta kebenaran lokasi.
 *
 * Dipanggil dari rangka aplikasi, jadi ia berjalan pada setiap halaman.
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
