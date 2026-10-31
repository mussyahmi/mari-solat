/**
 * Bahasa antara muka.
 *
 * Tiada pustaka i18n: setiap fail memegang kamusnya sendiri bersebelahan
 * kod yang menggunakannya, dalam bentuk
 *
 *   const ms = { tajuk: 'Tetapan', zon: (d: string) => `Zon ${d}` };
 *   const en: typeof ms = { tajuk: 'Settings', zon: d => `Zone ${d}` };
 *   const TEKS = { ms, en };
 *   …
 *   const t = useTeks(TEKS);
 *
 * `en: typeof ms` bermakna kunci yang tertinggal ialah ralat jenis, bukan
 * teks kosong di skrin. Menambah bahasa ketiga ialah menambah satu kunci.
 *
 * Nama solat dan istilah ibadah (Subuh, qada, zikir, Syawal) dikekalkan
 * dalam bahasa Inggeris — itulah yang digunakan penutur Inggeris di Malaysia.
 */

export const BAHASA = ['ms', 'en'] as const;
export type Bahasa = (typeof BAHASA)[number];
export type Kamus<T> = Record<Bahasa, T>;

export const NAMA_BAHASA: Record<Bahasa, string> = { ms: 'Bahasa Melayu', en: 'English' };
export const KOD_BAHASA: Record<Bahasa, string> = { ms: 'BM', en: 'EN' };

export const KUNCI_BAHASA = 'msolat_bahasa';

/** Pilihan tersimpan, atau bahasa telefon pada lawatan pertama. */
export function bahasaSemasa(): Bahasa {
  if (typeof window === 'undefined') return 'ms';
  try {
    const simpan = localStorage.getItem(KUNCI_BAHASA);
    if (simpan === 'ms' || simpan === 'en') return simpan;
  } catch {
    /* storan disekat */
  }
  return navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'ms';
}

/** Untuk teks di luar komponen React (toast dalam fungsi lib, dsb.). */
export const teksSemasa = <T,>(k: Kamus<T>): T => k[bahasaSemasa()];

/* ── Tarikh ──────────────────────────────────────────────────────────── */

export const BULAN: Kamus<string[]> = {
  ms: ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
};

export const BULAN_PENDEK: Kamus<string[]> = {
  ms: ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
};

/** 0 = Ahad, seperti Date.getDay(). */
export const HARI: Kamus<string[]> = {
  ms: ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const HARI_PENDEK: Kamus<string[]> = {
  ms: ['Ahd', 'Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

/** Bulan Hijri dikekalkan ejaan Malaysia dalam kedua-dua bahasa. */
export const BULAN_HIJRI = [
  'Muharram', 'Safar', 'Rabiulawal', 'Rabiulakhir', 'Jamadilawal', 'Jamadilakhir',
  'Rejab', 'Syaaban', 'Ramadan', 'Syawal', 'Zulkaedah', 'Zulhijjah',
];

export const PRAYER_LABEL = {
  subuh: 'Subuh', zohor: 'Zohor', asar: 'Asar', maghrib: 'Maghrib', isyak: 'Isyak',
} as const;

/** Teks notifikasi tolak — dihantar dari pelayan mengikut bahasa token. */
export const TEKS_NOTIFIKASI = {
  ms: {
    azanTajuk: (p: string) => `Waktu ${p}`,
    azanBadan: (p: string, zon: string) => `Sudah masuk waktu ${p}. (${zon})`,
    qadaTajuk: 'Jangan lupa solat qada hari ini',
    qadaBadan: 'Log solat qada anda sebelum hari berakhir.',
  },
  en: {
    azanTajuk: (p: string) => `${p} time`,
    azanBadan: (p: string, zon: string) => `It is now time for ${p}. (${zon})`,
    qadaTajuk: "Don't forget your qada prayers today",
    qadaBadan: 'Log your qada prayers before the day ends.',
  },
} satisfies Kamus<unknown>;
