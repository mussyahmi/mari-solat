import { parseTime, type WaktuSolat } from '@/lib/solat';

/**
 * Lima kategori dalam setiap waktu solat fardu, dari yang paling afdal hingga
 * yang hampir terlepas. Dipindahkan keluar daripada app/kategori-solat supaya
 * halaman utama boleh menunjukkan kategori semasa tanpa menyalin logiknya.
 */
export const KATEGORI = [
  { id: 'fadhilat', title: 'Fadhilat', description: 'Waktu paling awal selepas azan. Paling banyak pahala.' },
  { id: 'ikhtiar', title: 'Ikhtiar', description: 'Kira-kira 15 minit selepas azan. Waktu yang diutamakan.' },
  { id: 'jawaz', title: 'Jawaz', description: 'Waktu yang harus. Boleh sembahyang tapi bukan waktu terbaik.' },
  { id: 'karahah', title: 'Karahah', description: 'Kira-kira 20 minit sebelum masuk waktu solat seterusnya. Makruh.' },
  { id: 'tahrim', title: 'Tahrim', description: 'Hampir masuk waktu lain. Haram melambatkan hingga ke sini dengan sengaja, namun solat tetap sah.' },
] as const;

export type KategoriId = (typeof KATEGORI)[number]['id'];
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

/** Julat solat fardu yang merangkumi `kini`, jika ada. */
export function julatSemasa(waktu: WaktuSolat, kini: Date) {
  const t = (n: keyof WaktuSolat) => parseTime(waktu[n] as string, kini);
  const julat = [
    { nama: 'Subuh', mula: t('subuh'), tamat: t('syuruk') },
    { nama: 'Zohor', mula: t('zohor'), tamat: t('asar') },
    { nama: 'Asar', mula: t('asar'), tamat: t('maghrib') },
    { nama: 'Maghrib', mula: t('maghrib'), tamat: t('isyak') },
  ];
  return julat.find(w => kini >= w.mula && kini < w.tamat) ?? null;
}

export function kategoriPada(julat: Record<KategoriId, Julat>, kini: Date): KategoriId | null {
  const p = Object.entries(julat).find(([, w]) => kini >= w.dari && kini < w.ke);
  return (p?.[0] as KategoriId) ?? null;
}
