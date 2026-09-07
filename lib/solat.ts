import { adjustRawTime, formatTime } from '@/utils/format';

/**
 * Logik waktu solat yang dikongsi.
 *
 * Sebelum ini fetchSolat() dan parseTime() disalin ke dalam app/page.tsx,
 * app/kategori-solat/page.tsx dan app/satu-pertiga-malam/page.tsx, setiap satu
 * dengan sedikit perbezaan. Semuanya kini datang dari sini.
 */

export const WAKTU = [
  'imsak',
  'subuh',
  'syuruk',
  'dhuha',
  'zohor',
  'asar',
  'maghrib',
  'isyak',
] as const;

export type Waktu = (typeof WAKTU)[number];

/** Enam waktu fardu — tidak termasuk imsak, syuruk dan dhuha. */
export const WAKTU_FARDU = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;

export type WaktuSolat = Record<Waktu, string> & {
  gregorianDate: string;
  hijriDate: string;
};

const API = 'https://api.waktusolat.app';

export async function fetchSolat(zon: string, tarikh: Date) {
  const res = await fetch(
    `${API}/solat/${zon}/${tarikh.getDate()}?year=${tarikh.getFullYear()}&month=${tarikh.getMonth() + 1}`
  );
  const data = await res.json();
  if (!res.ok || data.status !== 'OK!') {
    throw new Error(`Waktu solat untuk zon ${zon} tidak dapat diambil.`);
  }
  return data;
}

/**
 * Susun respons API menjadi lapan waktu paparan.
 *
 * Dua daripadanya bukan dari API dan dikira di sini:
 *   imsak = subuh − 10 minit
 *   dhuha = syuruk + ⅓ × (syuruk − subuh)   [formula falak]
 */
export function binaWaktu(prayerTime: Record<string, string>): WaktuSolat {
  const [fh, fm] = prayerTime.fajr.split(':').map(Number);
  const [sh, sm] = prayerTime.syuruk.split(':').map(Number);
  const offsetDhuha = Math.round((sh * 60 + sm - (fh * 60 + fm)) / 3);

  return {
    imsak: formatTime(adjustRawTime(prayerTime.fajr, -10)),
    subuh: formatTime(prayerTime.fajr),
    syuruk: formatTime(prayerTime.syuruk),
    dhuha: formatTime(adjustRawTime(prayerTime.syuruk, offsetDhuha)),
    zohor: formatTime(prayerTime.dhuhr),
    asar: formatTime(prayerTime.asr),
    maghrib: formatTime(prayerTime.maghrib),
    isyak: formatTime(prayerTime.isha),
    gregorianDate: prayerTime.date,
    hijriDate: prayerTime.hijri,
  };
}

/** Tukar "7:19 PM" kepada Date pada hari yang diberi (lalai: hari ini). */
export function parseTime(masa: string, asas?: Date): Date {
  const tarikh = asas ? new Date(asas) : new Date();
  const [jamStr, selebihnya] = masa.split(':');
  const minit = Number(selebihnya.split(' ')[0]);
  const tengahHari = masa.includes('PM') ? 'PM' : 'AM';
  let jam = Number(jamStr);
  if (tengahHari === 'PM' && jam !== 12) jam += 12;
  if (tengahHari === 'AM' && jam === 12) jam = 0;
  tarikh.setHours(jam, minit, 0, 0);
  return tarikh;
}

export type BakiMasa = { jam: number; minit: number; saat: number };

export function pecahMs(ms: number): BakiMasa {
  let baki = Math.max(ms, 0);
  const jam = Math.floor(baki / 3_600_000);
  baki -= jam * 3_600_000;
  const minit = Math.floor(baki / 60_000);
  baki -= minit * 60_000;
  return { jam, minit, saat: Math.floor(baki / 1000) };
}

export function bakiMasa(sasaran: Date, dari: Date): BakiMasa {
  return pecahMs(sasaran.getTime() - dari.getTime());
}

/** "1 jam 4 minit 22 saat", melangkau unit yang kosong. */
export function bakiMasaTeks(ms: number) {
  const { jam, minit, saat } = pecahMs(ms);
  const bahagian: string[] = [];
  if (jam > 0) bahagian.push(`${jam} jam`);
  if (minit > 0) bahagian.push(`${minit} minit`);
  bahagian.push(`${saat} saat`);
  return bahagian.join(' ');
}

/* ──────────────────────────────────────────────────────────────
   Fasa hari
   Sempadan fasa ialah waktu solat itu sendiri, bukan jam yang
   dipilih sesuka hati. Digunakan untuk warna latar halaman yang
   beralih perlahan sepanjang hari.
   ────────────────────────────────────────────────────────────── */

export type Fasa = 'malam' | 'fajar' | 'subuh' | 'syuruk' | 'siang' | 'petang' | 'maghrib';

const HARI_MS = 86_400_000;

const kadar = (mula: number, tamat: number, kini: number) =>
  tamat <= mula ? 0 : Math.min(Math.max((kini - mula) / (tamat - mula), 0), 1);

/** Fasa hari pada satu-satu masa. */
export function fasaPada(waktu: WaktuSolat, kini: Date): { fasa: Fasa; kadar: number } {
  const t = (nama: Waktu) => parseTime(waktu[nama], kini).getTime();
  const n = kini.getTime();

  const imsak = t('imsak');
  const subuh = t('subuh');
  const syuruk = t('syuruk');
  const dhuha = t('dhuha');
  const asar = t('asar');
  const maghrib = t('maghrib');
  const isyak = t('isyak');

  // Selepas tengah malam tetapi sebelum imsak — masih malam semalam.
  if (n < imsak) return { fasa: 'malam', kadar: kadar(isyak - HARI_MS, imsak, n) };
  if (n < subuh) return { fasa: 'fajar', kadar: kadar(imsak, subuh, n) };
  if (n < syuruk) return { fasa: 'subuh', kadar: kadar(subuh, syuruk, n) };
  if (n < dhuha) return { fasa: 'syuruk', kadar: kadar(syuruk, dhuha, n) };
  if (n < asar) return { fasa: 'siang', kadar: kadar(dhuha, asar, n) };
  if (n < maghrib) return { fasa: 'petang', kadar: kadar(asar, maghrib, n) };
  if (n < isyak) return { fasa: 'maghrib', kadar: kadar(maghrib, isyak, n) };
  return { fasa: 'malam', kadar: kadar(isyak, imsak + HARI_MS, n) };
}

/* ──────────────────────────────────────────────────────────────
   Cache waktu hari ini
   Basuhan latar dipacu oleh waktu solat sebenar, tetapi hanya
   halaman utama yang mengambilnya. Menyimpannya di sini bermakna
   setiap halaman boleh mengira fasa yang sama tanpa panggilan
   rangkaian tambahan.
   ────────────────────────────────────────────────────────────── */

const KUNCI_CACHE = 'msolat_waktu_hari_ini';

const kunciTarikh = (d = new Date()) =>
  `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function simpanCacheWaktu(waktu: WaktuSolat) {
  try {
    localStorage.setItem(KUNCI_CACHE, JSON.stringify({ tarikh: kunciTarikh(), waktu }));
  } catch {
    /* storan penuh atau disekat — basuhan hanya jatuh ke lalai */
  }
}

export function bacaCacheWaktu(): WaktuSolat | null {
  try {
    const mentah = localStorage.getItem(KUNCI_CACHE);
    if (!mentah) return null;
    const { tarikh, waktu } = JSON.parse(mentah);
    // Waktu semalam akan memberi fasa yang salah, jadi ia diabaikan.
    return tarikh === kunciTarikh() ? (waktu as WaktuSolat) : null;
  } catch {
    return null;
  }
}
