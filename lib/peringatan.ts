import type { Kamus } from '@/lib/bahasa';

/**
 * Peringatan harian: ayat Al-Quran dan hadis mengikut topik.
 *
 * Fail ini hanya menyimpan RUJUKAN, tidak sekali-kali teks. Teks diambil
 * daripada sumber terbuka yang dipercayai supaya tiada satu perkataan pun
 * ditulis atau diterjemah sendiri:
 *   Al-Quran — api.alquran.cloud: teks Uthmani, terjemahan Melayu Basmeih,
 *              terjemahan Inggeris Sahih International.
 *   Hadis    — fawazahmed0/hadith-api: Sahih al-Bukhari dan Sahih Muslim
 *              sahaja, terjemahan Inggeris dan Indonesia. Tiada terjemahan
 *              Melayu rasmi wujud, jadi BM memaparkan terjemahan Indonesia
 *              yang dilabel dengan jelas.
 *
 * Setiap rujukan di bawah telah disemak dengan membaca teksnya, bukan
 * dipetik dari ingatan. Penomboran Muslim dalam API itu berbeza daripada
 * penomboran Abdul Baqi yang biasa dirujuk, jadi kedua-duanya disimpan:
 * `no` untuk mengambil, `rasmi` untuk dipaparkan dan dipautkan.
 */

export const TOPIK = [
  { id: 'keibubapaan', warna: 3, nama: { ms: 'Keibubapaan', en: 'Parenting' } },
  { id: 'sabar', warna: 4, nama: { ms: 'Sabar & marah', en: 'Patience & anger' } },
  { id: 'solat', warna: 1, nama: { ms: 'Solat', en: 'Solat' } },
  { id: 'zikir', warna: 0, nama: { ms: 'Zikir & syukur', en: 'Zikir & gratitude' } },
  { id: 'quran', warna: 2, nama: { ms: 'Al-Quran', en: 'Quran' } },
  { id: 'rahmat', warna: 5, nama: { ms: 'Harapan & rahmat', en: 'Hope & mercy' } },
] as const satisfies readonly { id: string; warna: number; nama: Kamus<string> }[];

export type IdTopik = (typeof TOPIK)[number]['id'];

export type Peringatan =
  | { id: string; jenis: 'quran'; surah: number; ayat: number; topik: IdTopik[] }
  | { id: string; jenis: 'hadis'; kitab: 'bukhari' | 'muslim'; no: number; rasmi: string; topik: IdTopik[] };

const q = (surah: number, ayat: number, ...topik: IdTopik[]): Peringatan =>
  ({ id: `q${surah}:${ayat}`, jenis: 'quran', surah, ayat, topik });
const b = (no: number, ...topik: IdTopik[]): Peringatan =>
  ({ id: `b${no}`, jenis: 'hadis', kitab: 'bukhari', no, rasmi: String(no), topik });
const m = (no: number, rasmi: string, ...topik: IdTopik[]): Peringatan =>
  ({ id: `m${no}`, jenis: 'hadis', kitab: 'muslim', no, rasmi, topik });

export const SEMUA: Peringatan[] = [
  // Keibubapaan
  q(66, 6, 'keibubapaan'),
  q(25, 74, 'keibubapaan'),
  q(3, 38, 'keibubapaan'),
  q(31, 13, 'keibubapaan'),
  q(14, 40, 'keibubapaan', 'solat'),
  q(20, 132, 'keibubapaan', 'solat'),
  q(17, 24, 'keibubapaan'),
  b(2554, 'keibubapaan'),
  b(5997, 'keibubapaan', 'rahmat'),
  b(5971, 'keibubapaan'),
  m(4223, '1631', 'keibubapaan'),

  // Sabar & marah
  q(2, 153, 'sabar', 'solat'),
  q(3, 134, 'sabar'),
  q(94, 5, 'sabar', 'rahmat'),
  q(39, 10, 'sabar'),
  q(42, 37, 'sabar'),
  q(2, 155, 'sabar'),
  b(6116, 'sabar'),
  b(6114, 'sabar'),
  b(1302, 'sabar'),
  b(6927, 'sabar'),
  m(6601, '2593', 'sabar', 'rahmat'),

  // Solat
  q(2, 45, 'solat', 'sabar'),
  q(29, 45, 'solat', 'quran'),
  q(20, 14, 'solat'),
  q(4, 103, 'solat'),
  q(2, 238, 'solat'),
  q(23, 2, 'solat'),
  b(528, 'solat'),
  b(527, 'solat', 'keibubapaan'),
  m(550, '233', 'solat'),

  // Zikir & syukur
  q(13, 28, 'zikir'),
  q(2, 152, 'zikir'),
  q(14, 7, 'zikir'),
  q(33, 41, 'zikir'),
  q(16, 18, 'zikir', 'rahmat'),
  q(3, 191, 'zikir'),
  b(6406, 'zikir'),
  b(6407, 'zikir'),
  b(6490, 'zikir'),
  m(7500, '2999', 'zikir', 'sabar'),

  // Al-Quran
  q(17, 9, 'quran'),
  q(54, 17, 'quran'),
  q(73, 4, 'quran'),
  q(38, 29, 'quran'),
  q(10, 57, 'quran', 'rahmat'),
  b(5027, 'quran'),
  m(1874, '804', 'quran'),

  // Harapan & rahmat
  q(39, 53, 'rahmat'),
  q(7, 156, 'rahmat'),
  q(12, 87, 'rahmat'),
  q(2, 186, 'rahmat'),
  q(65, 3, 'rahmat'),
  q(6, 54, 'rahmat'),
  b(6307, 'rahmat', 'zikir'),
  b(7405, 'rahmat', 'zikir'),
  b(6469, 'rahmat'),
  m(6859, '2702', 'rahmat', 'zikir'),
];

export const NAMA_KITAB: Record<'bukhari' | 'muslim', string> = {
  bukhari: 'Sahih al-Bukhari',
  muslim: 'Sahih Muslim',
};

export function pautan(p: Peringatan) {
  return p.jenis === 'quran'
    ? `https://quran.com/${p.surah}/${p.ayat}`
    : `https://sunnah.com/${p.kitab}:${p.rasmi}`;
}

/* ── Teks ────────────────────────────────────────────────────────────── */

export type Teks = {
  /** Teks Arab — Al-Quran sahaja; hadis dalam API membawa sanad penuh. */
  arab?: string;
  en: string;
  /** Melayu (Basmeih) bagi Al-Quran, Indonesia bagi hadis. */
  bm: string;
  /** Nama surah, cth. "Al-Furqaan". */
  surah?: string;
};

const KUNCI_CACHE = 'msolat_peringatan_teks_v1';

function bacaCache(): Record<string, Teks> {
  try { return JSON.parse(localStorage.getItem(KUNCI_CACHE) ?? '{}'); } catch { return {}; }
}

function simpanCache(id: string, t: Teks) {
  try {
    const c = bacaCache();
    c[id] = t;
    localStorage.setItem(KUNCI_CACHE, JSON.stringify(c));
  } catch { /* storan penuh — ambil semula lain kali */ }
}

const API_HADIS = 'https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions';

async function ambilHadis(edisi: string, no: number) {
  const r = await fetch(`${API_HADIS}/${edisi}/${no}.json`);
  if (!r.ok) throw new Error(edisi);
  const d = await r.json();
  return String(d.hadiths?.[0]?.text ?? '').trim();
}

// Had serentak kecil supaya halaman perpustakaan tidak menembak lima puluh
// permintaan sekali gus ke API percuma.
let aktif = 0;
const giliran: (() => void)[] = [];
async function denganHad<T>(f: () => Promise<T>): Promise<T> {
  if (aktif >= 4) await new Promise<void>(r => giliran.push(r));
  aktif++;
  try { return await f(); } finally { aktif--; giliran.shift()?.(); }
}

const dalamProses = new Map<string, Promise<Teks>>();

/** Teks sesuatu peringatan; disimpan selepas kali pertama kerana ia tidak berubah. */
export function ambilTeks(p: Peringatan): Promise<Teks> {
  const ada = bacaCache()[p.id];
  if (ada) return Promise.resolve(ada);
  const sedang = dalamProses.get(p.id);
  if (sedang) return sedang;

  const janji = denganHad(async () => {
    let t: Teks;
    if (p.jenis === 'quran') {
      const r = await fetch(`https://api.alquran.cloud/v1/ayah/${p.surah}:${p.ayat}/editions/quran-uthmani,ms.basmeih,en.sahih`);
      if (!r.ok) throw new Error('quran');
      const [ar, ms, en] = (await r.json()).data;
      t = { arab: ar.text, bm: ms.text, en: en.text, surah: en.surah.englishName };
    } else {
      const [en, bm] = await Promise.all([
        ambilHadis(`eng-${p.kitab}`, p.no),
        ambilHadis(`ind-${p.kitab}`, p.no),
      ]);
      t = { en, bm };
    }
    simpanCache(p.id, t);
    return t;
  }).finally(() => dalamProses.delete(p.id));

  dalamProses.set(p.id, janji);
  return janji;
}

/* ── Pilihan harian ──────────────────────────────────────────────────── */

const hariKe = (d = new Date()) => Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86_400_000);

/**
 * Sepasang peringatan — satu ayat, satu hadis — bagi topik itu. Pasangan
 * yang sama sepanjang hari; `anjakan` ialah butang "Lain".
 */
export function pasanganHari(topik: IdTopik, anjakan = 0) {
  const dalam = SEMUA.filter(p => p.topik.includes(topik));
  const ayat = dalam.filter(p => p.jenis === 'quran');
  const hadis = dalam.filter(p => p.jenis === 'hadis');
  const n = hariKe() + anjakan;
  return [ayat[n % ayat.length], hadis[n % hadis.length]].filter(Boolean) as Peringatan[];
}

/* ── Pilihan tersimpan ───────────────────────────────────────────────── */

export const KUNCI_TOPIK = 'msolat_peringatan_topik';
export const KUNCI_SIMPAN = 'msolat_peringatan_simpan';
export const PERISTIWA_SIMPAN = 'msolat-peringatan-simpan';

export function topikSemasa(): IdTopik {
  try {
    const t = localStorage.getItem(KUNCI_TOPIK);
    if (TOPIK.some(x => x.id === t)) return t as IdTopik;
  } catch { /* storan disekat */ }
  return 'keibubapaan';
}

export function bacaSimpanan(): string[] {
  try { return JSON.parse(localStorage.getItem(KUNCI_SIMPAN) ?? '[]'); } catch { return []; }
}

export function togolSimpan(id: string) {
  const ada = bacaSimpanan();
  const baru = ada.includes(id) ? ada.filter(x => x !== id) : [id, ...ada];
  try { localStorage.setItem(KUNCI_SIMPAN, JSON.stringify(baru)); } catch { /* storan disekat */ }
  window.dispatchEvent(new Event(PERISTIWA_SIMPAN));
  return baru;
}
