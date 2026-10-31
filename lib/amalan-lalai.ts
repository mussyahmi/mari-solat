import { collection, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/firebase';
import { adalahQuran, cadangan, type Amalan } from '@/lib/amalan';
import type { Bahasa } from '@/lib/bahasa';
import { todayStr } from '@/lib/qada';

/**
 * Tiga amalan lalai untuk setiap pengguna: Solat 5 waktu, Membaca Al-Quran
 * dan Zikir selepas solat. Ia dicipta jika belum ada dan tidak boleh dipadam
 * (hanya diubah), supaya halaman utama dan Jejak Ibadah sentiasa ada asasnya.
 */
export const adalahLalai = (a: Amalan) => a.jenis === 'solat' || a.jenis === 'zikir' || adalahQuran(a);

// Satu percubaan setiap pengguna setiap sesi — beberapa komponen boleh
// memanggil ini serentak, dan tanpa kunci ini amalan akan dicipta berganda.
const sedang = new Map<string, Promise<void>>();

export function pastikanLalai(uid: string, sedia: Amalan[], bahasa: Bahasa) {
  if (sedang.has(uid)) return sedang.get(uid)!;
  const perlu = cadangan(todayStr(), bahasa).filter(c => {
    if (c.jenis === 'solat') return !sedia.some(a => a.jenis === 'solat');
    if (c.jenis === 'zikir') return !sedia.some(a => a.jenis === 'zikir');
    return !sedia.some(adalahQuran);
  });
  if (perlu.length === 0) {
    sedang.set(uid, Promise.resolve());
    return sedang.get(uid)!;
  }
  // Diletakkan di atas senarai, mengikut susunan cadangan (Solat, Zikir, Al-Quran).
  const atas = Math.min(0, ...sedia.map(a => a.susunan)) - perlu.length;
  const batch = writeBatch(db);
  perlu.forEach((c, i) => batch.set(doc(collection(db, 'users', uid, 'amalan')), { ...c, susunan: atas + i }));
  const janji = batch.commit().catch(() => { sedang.delete(uid); });
  sedang.set(uid, janji);
  return janji;
}
