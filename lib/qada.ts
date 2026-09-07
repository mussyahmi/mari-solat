import type { Timestamp } from 'firebase/firestore';

/**
 * Jenis, pemalar dan pengiraan tulen untuk Qada Solat.
 *
 * Semuanya sebelum ini berada dalam app/qada-solat/page.tsx, fail 1,508 baris
 * yang menggabungkan pengiraan, panggilan Firestore dan susun atur dalam satu
 * komponen. Bahagian tulen dipindahkan ke sini supaya ia boleh dibaca dan
 * diuji tanpa memuatkan keseluruhan halaman.
 */

export const PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;
export type Prayer = typeof PRAYERS[number];
export type QadaCounts = Record<Prayer, number>;
export type Tab = 'rekod' | 'cabaran' | 'chat';
export type LbView = 'streak' | 'qada' | 'hari';

export const DEFAULT: QadaCounts = { subuh: 0, zohor: 0, asar: 0, maghrib: 0, isyak: 0 };

export type Participant = {
  uid: string;
  alias: string;
  streak: number;
  longestStreak: number;
  activeDays: number;
  totalQada: number;
  lastLogDate: string;
  qadaDone: boolean;
  mutedUntil?: Timestamp;
  muteCount?: number;
};

export type RankedParticipant = Participant & { rank: number };

export type ChatMessage = {
  id: string;
  uid: string;
  alias: string;
  text: string;
  createdAt: Timestamp | null;
  editedAt?: Timestamp | null;
  hidden: boolean;
  reports: string[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const REPORT_THRESHOLD = 5;
export const DAILY_REPORT_LIMIT = 3;
export const MUTE_DURATIONS_MIN = [60, 180, 360, 720, 1440];
export const EDIT_DELETE_LIMIT_MS = 5 * 60 * 1000;
export const CHALLENGE_START = { year: 2026, month: 4 };

export const MALAY_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogs', 'Sep', 'Okt', 'Nov', 'Dis'];
export const MALAY_MONTHS_FULL = ['Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun', 'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'];

export const ALIAS_ADJ = [
  'Berani', 'Bijak', 'Cekal', 'Gigih', 'Ikhlas', 'Mulia', 'Sabar', 'Setia',
  'Tabah', 'Warak', 'Rajin', 'Tekun', 'Amanah', 'Soleh', 'Tawadu', 'Jujur',
  'Redha', 'Syukur', 'Khusyuk', 'Tawakkal', 'Lembut', 'Dermawan', 'Adil',
  'Teguh', 'Tulus', 'Kasih', 'Istiqamah', 'Sayang', 'Murni', 'Suci',
];
export const ALIAS_NOUN = [
  'Harimau', 'Helang', 'Kancil', 'Singa', 'Badak', 'Gajah', 'Rusa', 'Merpati',
  'Lebah', 'Unta', 'Monyet', 'Zirafah', 'Penyu', 'Kucing', 'Merak',
  'Musang', 'Kumbang', 'Kuda', 'Jerung', 'Sotong', 'Kambing', 'Ketam',
  'Beruang', 'Arnab', 'Tupai', 'Kijang', 'Kerbau', 'Itik', 'Landak', 'Haruan',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function generateAlias() {
  const adj = ALIAS_ADJ[Math.floor(Math.random() * ALIAS_ADJ.length)];
  const noun = ALIAS_NOUN[Math.floor(Math.random() * ALIAS_NOUN.length)];
  return `${noun}${adj}`;
}

export function localDateStr(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function todayStr() { return localDateStr(new Date()); }

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function daysBetween(a: string, b: string): number {
  if (!a || !b) return 999;
  const dateA = new Date(a + 'T00:00:00');
  const dateB = new Date(b + 'T00:00:00');
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
}

export function formatMalayDateTime(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const period = h < 12 ? 'AM' : 'PM';
  return `${d.getDate()} ${MALAY_MONTHS[d.getMonth()]}, ${h % 12 || 12}:${m} ${period}`;
}

export function formatMalayDate(date: Date) {
  return `${date.getDate()} ${MALAY_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function estimateCompletion(total: number, rate: number): { label: string; date: string } | null {
  if (total <= 0 || rate <= 0) return null;
  const days = Math.ceil(total / rate);
  const date = new Date();
  date.setDate(date.getDate() + days);
  let label: string;
  if (days === 1) label = 'Esok';
  else if (days < 30) label = `${days} hari lagi`;
  else if (days < 365) {
    const mo = Math.floor(days / 30), rem = days % 30;
    label = rem > 0 ? `${mo} bulan ${rem} hari lagi` : `${mo} bulan lagi`;
  } else {
    // Pada skala tahun, baki hari ialah ketepatan palsu — kadar harian itu
    // sendiri berubah jauh lebih kerap daripada itu. Dua unit sudah memadai.
    const yr = Math.floor(days / 365), mo = Math.floor((days % 365) / 30);
    label = mo > 0 ? `${yr} tahun ${mo} bulan lagi` : `${yr} tahun lagi`;
  }
  return { label, date: formatMalayDate(date) };
}

export function isMonthComplete(mk: string): boolean {
  const [year, month] = mk.split('-').map(Number);
  const firstOfNext = new Date(year, month, 1);
  firstOfNext.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today >= firstOfNext;
}

export function lastDayOfMonth(mk: string): string {
  const [year, month] = mk.split('-').map(Number);
  const d = new Date(year, month, 0);
  return `${d.getDate()} ${MALAY_MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function getLbValue(p: Participant, view: LbView) {
  if (view === 'streak') return p.longestStreak;
  if (view === 'qada') return p.totalQada;
  return p.activeDays;
}
