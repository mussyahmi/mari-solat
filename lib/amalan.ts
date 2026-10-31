import { bacaCacheWaktu } from '@/lib/solat';
import { localDateStr } from '@/lib/qada';
import { HARI, type Bahasa } from '@/lib/bahasa';

/**
 * Jenis dan pengiraan tulen untuk Jejak Amalan.
 *
 * Tiga jenis amalan, kerana ketiganya dinilai dengan cara yang berbeza:
 *   sasaran — kuantiti harian (Al-Quran, muka surat). Kekurangan dibawa ke
 *             hadapan sebagai baki, dan hari yang melunaskannya ditanda emas.
 *   zikir   — senarai semak selepas setiap lima solat fardu. Tiada baki.
 *   jadual  — selesai atau tidak, hanya pada hari yang dijadualkan (puasa
 *             sunat). Tiada baki kerana ia sunat.
 *
 * Hari yang terlepas kekal kelabu walaupun bakinya dilunaskan kemudian —
 * rekod yang jujur, bukan rekod yang dicantikkan semula.
 */

export const SLOT = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;
export type Slot = (typeof SLOT)[number];
export const LABEL_SLOT: Record<Slot, string> = {
  subuh: 'Subuh', zohor: 'Zohor', asar: 'Asar', maghrib: 'Maghrib', isyak: 'Isyak',
};

export type ItemZikir = { id: string; nama: string };

export type Jadual =
  | { jenis: 'harian' }
  /** 0 = Ahad … 6 = Sabtu, seperti Date.getDay(). */
  | { jenis: 'hari'; hari: number[] }
  /** Hari bulan Hijri, cth. [13, 14, 15] untuk Ayyamul Bidh. */
  | { jenis: 'hijri'; tarikh: number[] }
  /** Mana-mana enam hari dalam Syawal. */
  | { jenis: 'syawal' };

export type Amalan = {
  id: string;
  nama: string;
  jenis: 'sasaran' | 'zikir' | 'solat' | 'jadual';
  /** sasaran: kuantiti sehari. */
  sasaran?: number;
  unit?: string;
  /** zikir: senarai semak selepas setiap solat. */
  item?: ItemZikir[];
  /** jadual: bila amalan ini perlu. */
  jadual?: Jadual;
  /** Penanda bacaan terakhir — amalan Al-Quran sahaja. */
  penanda?: { surah: number; ayat: number };
  /** Amalan bacaan Al-Quran (kad khas dengan penanda). */
  quran?: boolean;
  /** Indeks palet warna (lib/aksen PALET). Amalan lama tiada medan ini dan
      mengambil warna mengikut susunannya. */
  warna?: number;
  /** YYYY-MM-DD — hari sebelum ini tidak dinilai langsung. */
  mula: string;
  susunan: number;
};

/** Log satu hari. Medan yang digunakan bergantung pada jenis amalan. */
export type LogHari = {
  jumlah?: number;
  slot?: Partial<Record<Slot, string[]>>;
  /** Bilangan item zikir ketika hari ini direkod, supaya mengubah senarai
      kemudian tidak menilai semula hari lama. */
  n?: number;
  selesai?: boolean;
  /** solat: waktu fardu yang sudah ditunaikan hari itu. */
  solat?: Slot[];
};

export type LogTahun = Record<string, LogHari>;

/** Keadaan satu petak dalam grid. */
export type Petak =
  | { k: 'tiada' }        // sebelum amalan wujud, atau hari bukan jadual
  | { k: 'kosong' }       // hari ini atau akan datang, belum dibuat
  | { k: 'terlepas' }     // hari lepas, tiada langsung
  | { k: 'separa'; kadar: number }
  | { k: 'penuh' }
  | { k: 'qada'; dilunas: number };

export const SYAWAL = 10;
export const SASARAN_SYAWAL = 6;

/* ── Tarikh ──────────────────────────────────────────────────────────── */

export const tarikhKe = (s: string) => new Date(s + 'T12:00:00');

export function tambahHari(s: string, n: number) {
  const d = tarikhKe(s);
  d.setDate(d.getDate() + n);
  return localDateStr(d);
}

/* ── Hijri ───────────────────────────────────────────────────────────── */

const hijriFmt =
  typeof Intl !== 'undefined'
    ? new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', month: 'numeric', year: 'numeric' })
    : null;

function hijriMentah(d: Date) {
  if (!hijriFmt) return null;
  const bahagian = hijriFmt.formatToParts(d);
  const ambil = (t: string) => Number(bahagian.find(p => p.type === t)?.value);
  return { y: ambil('year'), m: ambil('month'), d: ambil('day') };
}

let ofsetHijri: number | null = null;

/**
 * Umm al-Qura kadangkala berbeza sehari daripada takwim JAKIM. Tarikh Hijri
 * hari ini dari API (dicache oleh halaman utama) digunakan untuk mengira
 * ofset itu sekali, kemudian digunakan pada setiap tarikh lain.
 */
function ofset() {
  if (ofsetHijri !== null) return ofsetHijri;
  ofsetHijri = 0;
  const cache = typeof window !== 'undefined' ? bacaCacheWaktu() : null;
  if (cache?.hijriDate) {
    const [, , hari] = cache.hijriDate.split('-').map(Number);
    for (const cuba of [0, -1, 1]) {
      const d = new Date();
      d.setDate(d.getDate() + cuba);
      if (hijriMentah(d)?.d === hari) { ofsetHijri = cuba; break; }
    }
  }
  return ofsetHijri;
}

const cacheHijri = new Map<string, ReturnType<typeof hijriMentah>>();

export function hijri(s: string) {
  let h = cacheHijri.get(s);
  if (h === undefined) {
    const d = tarikhKe(s);
    d.setDate(d.getDate() + ofset());
    h = hijriMentah(d);
    cacheHijri.set(s, h);
  }
  return h;
}

/* ── Penilaian ───────────────────────────────────────────────────────── */

/** Adakah amalan ini perlu dibuat pada tarikh ini? */
export function dijadualkan(a: Amalan, s: string) {
  if (s < a.mula) return false;
  if (a.jenis !== 'jadual' || !a.jadual) return true;
  const j = a.jadual;
  if (j.jenis === 'harian') return true;
  if (j.jenis === 'hari') return j.hari.includes(tarikhKe(s).getDay());
  const h = hijri(s);
  if (!h) return false;
  if (j.jenis === 'hijri') return j.tarikh.includes(h.d);
  return h.m === SYAWAL;
}

export function kadarZikir(log: LogHari | undefined, n: number) {
  if (!log?.slot || n === 0) return 0;
  const bil = log.n ?? n;
  let ditanda = 0;
  for (const s of SLOT) ditanda += Math.min(log.slot[s]?.length ?? 0, bil);
  return ditanda / (bil * SLOT.length);
}

export function slotLengkap(log: LogHari | undefined, slot: Slot, n: number) {
  const bil = log?.n ?? n;
  return bil > 0 && (log?.slot?.[slot]?.length ?? 0) >= bil;
}

export type Nilaian = {
  petak: Record<string, Petak>;
  /** Baki yang dibawa masuk ke setiap hari (sasaran sahaja). */
  bakiMasuk: Record<string, number>;
};

/**
 * Nilai setiap hari dari `dari` hingga `hingga` (inklusif).
 *
 * Bagi jenis sasaran, baki mesti dikira dari hari amalan bermula walaupun
 * grid hanya memaparkan sebahagian — kekurangan bulan lepas masih dibawa.
 */
export function nilai(a: Amalan, log: LogTahun, dari: string, hingga: string, hariIni: string): Nilaian {
  const petak: Record<string, Petak> = {};
  const bakiMasuk: Record<string, number> = {};
  const mula = a.jenis === 'sasaran' && a.mula < dari ? a.mula : dari;
  const sasaran = Math.max(a.sasaran ?? 1, 1);
  const n = a.item?.length ?? 0;
  let baki = 0;

  for (let s = mula; s <= hingga; s = tambahHari(s, 1)) {
    const papar = s >= dari;
    const lepas = s < hariIni;
    const hari = log[s];

    if (!dijadualkan(a, s)) {
      if (papar) petak[s] = { k: 'tiada' };
      continue;
    }

    if (a.jenis === 'sasaran') {
      bakiMasuk[s] = baki;
      // Hari akan datang belum ada apa-apa untuk dinilai, dan baki tidak
      // patut terus bertambah melepasi hari ini.
      if (s > hariIni) { if (papar) petak[s] = { k: 'kosong' }; continue; }
      const dibuat = hari?.jumlah ?? 0;
      const lebihan = Math.max(dibuat - sasaran, 0);
      const dilunas = Math.min(lebihan, baki);
      baki -= dilunas;
      if (lepas && dibuat < sasaran) baki += sasaran - dibuat;

      if (!papar) continue;
      if (dilunas > 0) petak[s] = { k: 'qada', dilunas };
      else if (dibuat >= sasaran) petak[s] = { k: 'penuh' };
      else if (dibuat > 0) petak[s] = { k: 'separa', kadar: dibuat / sasaran };
      else petak[s] = lepas ? { k: 'terlepas' } : { k: 'kosong' };
      continue;
    }

    if (!papar) continue;

    if (a.jenis === 'zikir') {
      const k = kadarZikir(hari, n);
      if (k >= 1) petak[s] = { k: 'penuh' };
      else if (k > 0) petak[s] = { k: 'separa', kadar: k };
      else petak[s] = lepas ? { k: 'terlepas' } : { k: 'kosong' };
      continue;
    }

    if (a.jenis === 'solat') {
      const k = (hari?.solat?.length ?? 0) / SLOT.length;
      if (k >= 1) petak[s] = { k: 'penuh' };
      else if (k > 0) petak[s] = { k: 'separa', kadar: k };
      else petak[s] = lepas ? { k: 'terlepas' } : { k: 'kosong' };
      continue;
    }

    // jadual
    if (hari?.selesai) petak[s] = { k: 'penuh' };
    // Puasa Enam boleh dibuat pada mana-mana hari Syawal, jadi hari yang
    // tidak berpuasa bukan "terlepas".
    else if (a.jadual?.jenis === 'syawal') petak[s] = { k: 'kosong' };
    else petak[s] = lepas ? { k: 'terlepas' } : { k: 'kosong' };
  }

  return { petak, bakiMasuk };
}

/** Baki terkumpul sehingga (tidak termasuk) tarikh ini. */
export function bakiSebelum(a: Amalan, log: LogTahun, s: string, hariIni: string) {
  if (a.jenis !== 'sasaran' || s < a.mula) return 0;
  return nilai(a, log, s, s, hariIni).bakiMasuk[s] ?? 0;
}

/** Hari Syawal yang sudah berpuasa dalam tahun Hijri tarikh ini. */
export function kiraSyawal(log: LogTahun, s: string) {
  const h = hijri(s);
  if (!h) return 0;
  return Object.entries(log).filter(([t, l]) => {
    if (!l.selesai) return false;
    const x = hijri(t);
    return x?.y === h.y && x.m === SYAWAL;
  }).length;
}

const TEKS_JADUAL = {
  ms: {
    setiapHari: 'Setiap hari',
    hijri: (t: string) => `${t} setiap bulan Hijri`,
    syawal: (n: number) => `${n} hari dalam Syawal`,
  },
  en: {
    setiapHari: 'Every day',
    hijri: (t: string) => `${t} of every Hijri month`,
    syawal: (n: number) => `${n} days in Syawal`,
  },
};

export function teksJadual(j: Jadual | undefined, bahasa: Bahasa) {
  const t = TEKS_JADUAL[bahasa];
  if (!j || j.jenis === 'harian') return t.setiapHari;
  if (j.jenis === 'hari') {
    const susun = [...j.hari].sort((x, y) => ((x + 6) % 7) - ((y + 6) % 7));
    return susun.map(h => HARI[bahasa][h]).join(', ');
  }
  if (j.jenis === 'hijri') return t.hijri([...j.tarikh].sort((x, y) => x - y).join(', '));
  return t.syawal(SASARAN_SYAWAL);
}

export const idBaru = () => Math.random().toString(36).slice(2, 10);

const TEKS_CADANGAN = {
  ms: {
    quran: 'Membaca Al-Quran', unit: 'muka surat', zikir: 'Zikir selepas solat', solat: 'Solat 5 waktu',
    item: ['Subhanallah 33x', 'Alhamdulillah 33x', 'Allahu Akbar 33x', 'Ayatul Kursi'],
  },
  en: {
    quran: 'Reading the Quran', unit: 'pages', zikir: 'Zikir after prayer', solat: 'Five daily prayers',
    item: ['Subhanallah 33x', 'Alhamdulillah 33x', 'Allahu Akbar 33x', 'Ayatul Kursi'],
  },
};

/** Cadangan untuk permulaan, diambil daripada amalan yang diminta. */
export function cadangan(hariIni: string, bahasa: Bahasa): Omit<Amalan, 'id'>[] {
  const t = TEKS_CADANGAN[bahasa];
  const z = (nama: string) => ({ id: idBaru(), nama });
  return [
    { nama: t.solat, jenis: 'solat', mula: hariIni, susunan: 0, warna: 2 },
    { nama: t.zikir, jenis: 'zikir', mula: hariIni, susunan: 1, item: t.item.map(z), warna: 1 },
    { nama: t.quran, jenis: 'sasaran', sasaran: 1, unit: t.unit, mula: hariIni, susunan: 2, warna: 0, quran: true },
  ];
}

/** Indeks palet bagi amalan ini. */
export const warnaAmalan = (a: Pick<Amalan, 'warna' | 'susunan'>) => a.warna ?? a.susunan;

/**
 * Unit yang dikenali dipaparkan dalam bahasa antara muka, bukan bahasa ia
 * disimpan — amalan yang dicipta dalam BM menyimpan "muka surat", tetapi
 * dalam EN ia sepatutnya dibaca "pages". Unit tersuai dipaparkan seadanya.
 */
const UNIT_DIKENALI = [
  { ms: 'muka surat', en: ['page', 'pages'] },
  { ms: 'kali', en: ['time', 'times'] },
  { ms: 'juzuk', en: ['juz', 'juz'] },
  { ms: 'ayat', en: ['verse', 'verses'] },
];

export function unitPapar(unit: string | undefined, bahasa: Bahasa, n = 2) {
  const u = (unit ?? '').trim();
  const kenal = UNIT_DIKENALI.find(k => k.ms === u.toLowerCase() || k.en.includes(u.toLowerCase()));
  if (!kenal) return u;
  return bahasa === 'ms' ? kenal.ms : kenal.en[n === 1 ? 0 : 1];
}

/** Amalan bacaan Al-Quran — ditanda, atau amalan sasaran lama yang namanya menyebut Quran. */
export const adalahQuran = (a: Amalan) => a.jenis === 'sasaran' && (a.quran === true || /qur/i.test(a.nama));

/** Amalan "Solat 5 waktu" baharu — dicipta automatik kali pertama solat ditanda. */
export function solatBaru(bahasa: Bahasa, mula: string, susunan: number): Omit<Amalan, 'id'> {
  return { nama: TEKS_CADANGAN[bahasa].solat, jenis: 'solat', mula, susunan, warna: 2 };
}

/**
 * Susunan paparan: Solat dahulu, Zikir selepas solat terus di bawahnya
 * (kerana ia mengikut solat), kemudian selebihnya mengikut susunan pengguna.
 */
export function susunAmalan(senarai: Amalan[]) {
  const pangkat = (a: Amalan) => (a.jenis === 'solat' ? 0 : a.jenis === 'zikir' ? 1 : 2);
  return [...senarai].sort((a, b) => pangkat(a) - pangkat(b) || a.susunan - b.susunan);
}
