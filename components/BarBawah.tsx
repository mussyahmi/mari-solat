'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'motion/react';
import { CalendarCheck2, Clock3, Compass, LayoutGrid, Sprout } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';
import { isActivePath } from '@/lib/nav';
import { spring } from '@/lib/motion';
import { cn } from '@/lib/utils';

export const PERISTIWA_BUKA_MENU = 'msolat-buka-menu';

const ms = { waktu: 'Waktu', amalan: 'Amalan', qada: 'Qada', kiblat: 'Kiblat', lagi: 'Lagi', navigasi: 'Navigasi utama' };
const en: typeof ms = { waktu: 'Times', amalan: 'Ibadah', qada: 'Qada', kiblat: 'Qibla', lagi: 'More', navigasi: 'Main navigation' };
const TEKS = { ms, en };

const TAB = [
  { href: '/', kunci: 'waktu', Ikon: Clock3 },
  { href: '/amalan', kunci: 'amalan', Ikon: Sprout },
  { href: '/qada-solat', kunci: 'qada', Ikon: CalendarCheck2 },
  { href: '/arah-kiblat', kunci: 'kiblat', Ikon: Compass },
] as const;

/**
 * Bar tab bawah untuk telefon. Empat halaman yang paling kerap dibuka berada
 * satu ketikan dari ibu jari; "Lagi" membuka laci penuh di kepala.
 */
export default function BarBawah() {
  const pathname = usePathname();
  const t = useTeks(TEKS);
  const lagiAktif = !TAB.some(tab => isActivePath(pathname, tab.href));

  const butang = (aktif: boolean, Ikon: typeof Clock3, label: string) => (
    <span className="relative flex flex-col items-center gap-1 px-3 py-2">
      {aktif && (
        <motion.span layoutId="tabBawah" className="absolute inset-0 rounded-2xl bg-accent" transition={spring.susunAtur} />
      )}
      <Ikon className={cn('relative size-5', aktif ? 'text-accent-foreground' : 'text-muted-foreground')} strokeWidth={aktif ? 2.2 : 1.8} />
      <span className={cn('relative text-[11px] leading-none', aktif ? 'font-semibold text-accent-foreground' : 'text-muted-foreground')}>{label}</span>
    </span>
  );

  return (
    <nav
      aria-label={t.navigasi}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
        {TAB.map(({ href, kunci, Ikon }) => {
          const aktif = isActivePath(pathname, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={aktif ? 'page' : undefined}>
                {butang(aktif, Ikon, t[kunci])}
              </Link>
            </li>
          );
        })}
        <li>
          <button type="button" onClick={() => window.dispatchEvent(new Event(PERISTIWA_BUKA_MENU))}>
            {butang(lagiAktif, LayoutGrid, t.lagi)}
          </button>
        </li>
      </ul>
    </nav>
  );
}
