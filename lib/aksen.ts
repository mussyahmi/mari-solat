import type { Kamus } from '@/lib/bahasa';

/**
 * Warna tema pilihan pengguna.
 *
 * Setiap pilihan hanya menukar --rona dalam globals.css; setiap token lain
 * diterbitkan daripadanya. Hijau kekal lalai kerana ia warna MariSolat.
 */
export const AKSEN = [
  { id: 'hijau', rona: 162, nama: { ms: 'Hijau', en: 'Green' } },
  { id: 'teal', rona: 200, nama: { ms: 'Teal', en: 'Teal' } },
  { id: 'biru', rona: 255, nama: { ms: 'Biru', en: 'Blue' } },
  { id: 'ungu', rona: 295, nama: { ms: 'Ungu', en: 'Purple' } },
  { id: 'merah', rona: 355, nama: { ms: 'Merah jambu', en: 'Pink' } },
  { id: 'jingga', rona: 55, nama: { ms: 'Jingga', en: 'Orange' } },
] as const satisfies readonly { id: string; rona: number; nama: Kamus<string> }[];

export type Aksen = (typeof AKSEN)[number]['id'];

export const KUNCI_AKSEN = 'msolat_aksen';
export const PERISTIWA_AKSEN = 'msolat-aksen';

export function aksenSemasa(): Aksen {
  try {
    const simpan = localStorage.getItem(KUNCI_AKSEN);
    if (AKSEN.some(a => a.id === simpan)) return simpan as Aksen;
  } catch {
    /* storan disekat */
  }
  return 'hijau';
}

export function tetapkanAksen(a: Aksen) {
  try { localStorage.setItem(KUNCI_AKSEN, a); } catch { /* storan disekat */ }
  if (a === 'hijau') delete document.documentElement.dataset.aksen;
  else document.documentElement.dataset.aksen = a;
  window.dispatchEvent(new Event(PERISTIWA_AKSEN));
}

/** Dijalankan sebaris sebelum cat pertama supaya tiada kelipan warna hijau. */
export const SKRIP_AKSEN = `try{var a=localStorage.getItem('${KUNCI_AKSEN}');if(a&&a!=='hijau')document.documentElement.dataset.aksen=a}catch(e){}`;

/**
 * Enam warna palet (--w1 … --w6 dalam globals.css). Kelas ditulis penuh
 * supaya Tailwind menjananya.
 */
export const PALET = [
  { pekat: 'bg-w1', teks: 'text-w1', lembut: 'bg-w1-lembut', css: 'var(--w1)' },
  { pekat: 'bg-w2', teks: 'text-w2', lembut: 'bg-w2-lembut', css: 'var(--w2)' },
  { pekat: 'bg-w3', teks: 'text-w3', lembut: 'bg-w3-lembut', css: 'var(--w3)' },
  { pekat: 'bg-w4', teks: 'text-w4', lembut: 'bg-w4-lembut', css: 'var(--w4)' },
  { pekat: 'bg-w5', teks: 'text-w5', lembut: 'bg-w5-lembut', css: 'var(--w5)' },
  { pekat: 'bg-w6', teks: 'text-w6', lembut: 'bg-w6-lembut', css: 'var(--w6)' },
] as const;

export const palet = (i: number) => PALET[((i % PALET.length) + PALET.length) % PALET.length];

/**
 * Warna tetap bagi setiap waktu, dikongsi oleh setiap halaman supaya Subuh
 * sentiasa ungu, Maghrib sentiasa merah jambu, dan seterusnya. Indeks ke
 * dalam PALET.
 */
export const WARNA_WAKTU = {
  imsak: 5, subuh: 0, syuruk: 4, dhuha: 4, zohor: 1, asar: 2, maghrib: 3, isyak: 5,
} as const;
