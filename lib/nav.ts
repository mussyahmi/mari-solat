/**
 * Satu-satunya sumber untuk item navigasi.
 *
 * Sebelum ini senarai ini wujud dua kali — sekali sebagai const dalam
 * Sidebar.tsx dan sekali lagi sebagai JSX dalam Header.tsx — jadi kedua-duanya
 * pasti akan terpesong. Kedua-dua permukaan kini membaca dari sini.
 */

export type NavLink = {
  href: string;
  label: string;
};

export type NavGroup = {
  label: string;
  links: NavLink[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Waktu',
    links: [
      { href: '/', label: 'Waktu Solat' },
      { href: '/arah-kiblat', label: 'Arah Kiblat' },
      { href: '/kategori-solat', label: 'Kategori Waktu' },
      { href: '/satu-pertiga-malam', label: 'Satu Pertiga Malam' },
      { href: '/qada-solat', label: 'Qada Solat' },
    ],
  },
  {
    label: 'Amalan',
    links: [{ href: '/tasbih', label: 'Tasbih' }],
  },
  {
    label: 'Ilmu Solat',
    links: [
      { href: '/rukun-solat', label: 'Rukun Solat' },
      { href: '/syarat-wajib-solat', label: 'Syarat Wajib Solat' },
      { href: '/syarat-sah-solat', label: 'Syarat Sah Solat' },
      { href: '/pembatal-solat', label: 'Pembatal Solat' },
    ],
  },
  {
    label: 'Lain-lain',
    links: [{ href: '/tetapan', label: 'Tetapan' }],
  },
];

/** Padanan tepat, kecuali '/' yang hanya aktif pada laluan akarnya sendiri. */
export function isActivePath(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
