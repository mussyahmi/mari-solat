import { parseTime, type WaktuSolat } from '@/lib/solat';
import type { Kamus } from '@/lib/bahasa';

/**
 * Lima kategori dalam setiap waktu solat fardu, dari yang paling afdal hingga
 * yang hampir terlepas. Dipindahkan keluar daripada app/kategori-solat supaya
 * halaman utama boleh menunjukkan kategori semasa tanpa menyalin logiknya.
 */
export const KATEGORI = [
  { id: 'fadhilat', title: 'Fadhilat' },
  { id: 'ikhtiar', title: 'Ikhtiar' },
  { id: 'jawaz', title: 'Jawaz' },
  { id: 'karahah', title: 'Karahah' },
  { id: 'tahrim', title: 'Tahrim' },
] as const;

export type KategoriId = (typeof KATEGORI)[number]['id'];

export const HURAIAN_KATEGORI: Kamus<Record<KategoriId, string>> = {
  ms: {
    fadhilat: 'Waktu paling awal selepas azan. Paling banyak pahala.',
    ikhtiar: 'Kira-kira 15 minit selepas azan. Waktu yang diutamakan.',
    jawaz: 'Waktu yang harus. Boleh sembahyang tapi bukan waktu terbaik.',
    karahah: 'Kira-kira 20 minit sebelum masuk waktu solat seterusnya. Makruh.',
    tahrim: 'Hampir masuk waktu lain. Haram melambatkan hingga ke sini dengan sengaja, namun solat tetap sah.',
  },
  en: {
    fadhilat: 'Virtue — the earliest time, right after the azan. The greatest reward.',
    ikhtiar: 'Preferred — about 15 minutes after the azan. The time to aim for.',
    jawaz: 'Permissible — you may pray now, but it is not the best time.',
    karahah: 'Disliked (makruh) — about 20 minutes before the next prayer time begins.',
    tahrim: 'Forbidden — the next prayer is about to begin. Deliberately delaying until now is haram, though the prayer is still valid.',
  },
};

export type Julat = { dari: Date; ke: Date };

// Sempadan tetap bagi setiap julat: 15 | 15 | baki | 20 | 5 minit.
export function julatKategori(mula: Date, tamat: Date): Record<KategoriId, Julat> {
  const s = mula.getTime();
  const e = tamat.getTime();
  const F = 15 * 60_000, I = 15 * 60_000, K = 20 * 60_000, T = 5 * 60_000;
  return {
    fadhilat: { dari: new Date(s), ke: new Date(s + F) },
    ikhtiar: { dari: new Date(s + F), ke: new Date(s + F + I) },
    jawaz: { dari: new Date(s + F + I), ke: new Date(e - K) },
    karahah: { dari: new Date(e - K), ke: new Date(e - T) },
    tahrim: { dari: new Date(e - T), ke: new Date(e) },
  };
}

export type JulatSolat = { nama: string; mula: Date; tamat: Date };

/**
 * Setiap julat solat fardu di sekitar `kini`, mengikut urutan.
 *
 * Isyak ialah satu-satunya waktu yang melintasi tengah malam, jadi ia muncul
 * dua kali — sekali berakhir pada subuh hari ini, sekali bermula malam ini —
 * dan memerlukan waktu hari bersebelahan, bukan hari ini sahaja.
 */
export function senaraiJulat(
  waktu: WaktuSolat,
  kini: Date,
  jiran?: { semalam?: WaktuSolat; esok?: WaktuSolat }
): JulatSolat[] {
  const t = (n: keyof WaktuSolat, asas: Date = kini) => parseTime(waktu[n] as string, asas);
  const tarikhSemalam = new Date(kini.getTime() - 86_400_000);
  const tarikhEsok = new Date(kini.getTime() + 86_400_000);

  // Jika waktu hari bersebelahan belum dimuatkan, waktu hari ini digunakan
  // pada tarikh jiran. Subuh dan isyak beralih beberapa saat sehari, jadi
  // ralatnya jauh lebih kecil daripada sempadan kategori tersempit (5 minit).
  const isyakSemalam = parseTime((jiran?.semalam ?? waktu).isyak, tarikhSemalam);
  const subuhEsok = parseTime((jiran?.esok ?? waktu).subuh, tarikhEsok);

  return [
    { nama: 'Isyak', mula: isyakSemalam, tamat: t('subuh') },
    { nama: 'Subuh', mula: t('subuh'), tamat: t('syuruk') },
    { nama: 'Zohor', mula: t('zohor'), tamat: t('asar') },
    { nama: 'Asar', mula: t('asar'), tamat: t('maghrib') },
    { nama: 'Maghrib', mula: t('maghrib'), tamat: t('isyak') },
    { nama: 'Isyak', mula: t('isyak'), tamat: subuhEsok },
  ];
}

/**
 * Julat solat fardu yang merangkumi `kini`, jika ada.
 *
 * Isyak dahulunya tiada dalam senarai ini sama sekali, jadi halaman utama
 * memaparkan "Di luar waktu" dari isyak hingga subuh — hampir sepanjang malam.
 *
 * Tiada julat antara syuruk dan zohor: tiada solat fardu di sana, jadi
 * "Di luar waktu" memang betul pada waktu itu.
 */
export function julatSemasa(
  waktu: WaktuSolat,
  kini: Date,
  jiran?: { semalam?: WaktuSolat; esok?: WaktuSolat }
) {
  return senaraiJulat(waktu, kini, jiran).find(w => kini >= w.mula && kini < w.tamat) ?? null;
}

export function kategoriPada(julat: Record<KategoriId, Julat>, kini: Date): KategoriId | null {
  const p = Object.entries(julat).find(([, w]) => kini >= w.dari && kini < w.ke);
  return (p?.[0] as KategoriId) ?? null;
}
