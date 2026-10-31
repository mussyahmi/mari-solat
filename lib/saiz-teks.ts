import type { Kamus } from '@/lib/bahasa';

/**
 * Saiz teks pilihan pengguna. Menukar saiz fon akar menskalakan seluruh
 * aplikasi secara berkadar (Tailwind menggunakan rem), jadi teks, butang dan
 * jarak membesar bersama dan susun atur kekal seimbang.
 */
export const SAIZ_TEKS = [
  { id: 'kecil', peratus: 87.5, nama: { ms: 'Kecil', en: 'Small' } },
  { id: 'sederhana', peratus: 93.75, nama: { ms: 'Sederhana', en: 'Medium' } },
  { id: 'normal', peratus: 100, nama: { ms: 'Normal', en: 'Normal' } },
] as const satisfies readonly { id: string; peratus: number; nama: Kamus<string> }[];

export type SaizTeks = (typeof SAIZ_TEKS)[number]['id'];

export const KUNCI_SAIZ = 'msolat_saiz_teks';

export function saizSemasa(): SaizTeks {
  try {
    const s = localStorage.getItem(KUNCI_SAIZ);
    if (SAIZ_TEKS.some(x => x.id === s)) return s as SaizTeks;
  } catch { /* storan disekat */ }
  return 'normal';
}

export function tetapkanSaiz(s: SaizTeks) {
  try { localStorage.setItem(KUNCI_SAIZ, s); } catch { /* storan disekat */ }
  const p = SAIZ_TEKS.find(x => x.id === s)!.peratus;
  document.documentElement.style.fontSize = p === 100 ? '' : `${p}%`;
}

/** Dijalankan sebaris sebelum cat pertama supaya saiz tidak melompat semasa dimuatkan. */
export const SKRIP_SAIZ = `try{var z={kecil:87.5,sederhana:93.75}[localStorage.getItem('${KUNCI_SAIZ}')];if(z)document.documentElement.style.fontSize=z+'%'}catch(e){}`;
