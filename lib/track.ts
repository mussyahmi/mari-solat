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
 * Empat tempat perpuluhan ≈ 11 meter — cukup tepat untuk menunjuk ke rumah
 * seseorang, terikat pada UUID yang kekal. Peta dan kiraan zon di /pantau
 * kelihatan sama pada dua tempat perpuluhan (≈ 1.1 km), jadi itu sahaja yang
 * disimpan.
 */
const bulatkan = (n: number) => Math.round(n * 100) / 100;

const kunciHari = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export async function trackVisit(lat: number, lng: number, zone: string) {
  // Dahulu ini membanding koordinat mentah, jadi peranti yang tidak bergerak
  // tidak pernah menulis semula dan cap masanya membeku. Sekali sehari
  // memberi "kali terakhir dilihat" yang benar-benar bergerak, dan pada dua
  // tempat perpuluhan koordinat sendiri jarang berubah.
  const hariIni = kunciHari();
  if (localStorage.getItem('msolat_last_tracked_day') === hariIni) return;
  try {
    const uuid = getOrCreateUUID();
    await setDoc(doc(db, 'visits', uuid), {
      uuid,
      lat: bulatkan(lat),
      lng: bulatkan(lng),
      zone,
      timestamp: Timestamp.now(),
      ua: navigator.userAgent.slice(0, 400),
    });
    localStorage.setItem('msolat_last_tracked_day', hariIni);
  } catch { /* senyap */ }
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
  const res = await fetch('/api/pantau', {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  if (!res.ok) {
    throw new Error(res.status === 403 ? 'tidak-dibenarkan' : 'gagal');
  }
  return res.json();
}
