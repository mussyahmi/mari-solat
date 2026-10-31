/**
 * Satu-satunya sumber untuk item navigasi.
 *
 * Sebelum ini senarai ini wujud dua kali — sekali sebagai const dalam
 * Sidebar.tsx dan sekali lagi sebagai JSX dalam Header.tsx — jadi kedua-duanya
 * pasti akan terpesong. Kedua-dua permukaan kini membaca dari sini.
 */

import type { Kamus } from '@/lib/bahasa';

export type NavLink = {
  href: string;
  label: Kamus<string>;
};

export type NavGroup = {
  label: Kamus<string>;
  links: NavLink[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: { ms: 'Waktu', en: 'Times' },
    // Susunan mengikut jenis, bukan rawak: tiga yang pertama semuanya
    // diterbitkan daripada waktu solat hari ini, jadi ia berkumpul di bawah
    // Waktu Solat. Arah Kiblat menjawab soalan yang berbeza sama sekali —
    // kedudukan, bukan masa — jadi ia datang selepas kumpulan itu.
    links: [
      { href: '/', label: { ms: 'Waktu Solat', en: 'Prayer Times' } },
      { href: '/kategori-solat', label: { ms: 'Kategori Waktu', en: 'Time Categories' } },
      { href: '/satu-pertiga-malam', label: { ms: 'Satu Pertiga Malam', en: 'Last Third of the Night' } },
      { href: '/arah-kiblat', label: { ms: 'Arah Kiblat', en: 'Qibla Direction' } },
      { href: '/qada-solat', label: { ms: 'Qada Solat', en: 'Qada Prayers' } },
    ],
  },
  {
    label: { ms: 'Amalan', en: 'Practices' },
    links: [
      { href: '/amalan', label: { ms: 'Jejak Amalan', en: 'Ibadah Tracker' } },
      { href: '/peringatan', label: { ms: 'Peringatan', en: 'Reminders' } },
      { href: '/tasbih', label: { ms: 'Tasbih', en: 'Tasbih' } },
      { href: '/istighfar', label: { ms: 'Nafas Istighfar', en: 'Istighfar Breathing' } },
    ],
  },
  {
    label: { ms: 'Ilmu Solat', en: 'Prayer Knowledge' },
    links: [
      { href: '/rukun-solat', label: { ms: 'Rukun Solat', en: 'Pillars of Prayer' } },
      { href: '/syarat-wajib-solat', label: { ms: 'Syarat Wajib Solat', en: 'Obligation Conditions' } },
      { href: '/syarat-sah-solat', label: { ms: 'Syarat Sah Solat', en: 'Validity Conditions' } },
      { href: '/pembatal-solat', label: { ms: 'Pembatal Solat', en: 'Prayer Invalidators' } },
    ],
  },
  {
    label: { ms: 'Lain-lain', en: 'Other' },
    links: [{ href: '/tetapan', label: { ms: 'Tetapan', en: 'Settings' } }],
  },
];

/** Padanan tepat, kecuali '/' yang hanya aktif pada laluan akarnya sendiri. */
export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
