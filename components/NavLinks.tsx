'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BanIcon, BookHeartIcon, GiftIcon, BookOpenIcon, ClockIcon, CompassIcon, LayersIcon, ListChecksIcon,
  MoonStarIcon, RotateCcwIcon, ScrollTextIcon, SettingsIcon, ShieldCheckIcon,
  SparklesIcon, WindIcon, type LucideIcon,
} from 'lucide-react';
import { NAV_GROUPS, isActivePath } from '@/lib/nav';
import { palet } from '@/lib/aksen';
import { cn } from '@/lib/utils';
import { useBahasa } from '@/components/BahasaProvider';

/**
 * Ikon dan warna palet bagi setiap pautan. Disimpan di sini, bukan dalam
 * lib/nav.ts, kerana ia hal paparan laci sahaja. Warna digilirkan supaya
 * pautan bersebelahan tidak sama.
 */
const IKON: Record<string, { ikon: LucideIcon; w: number }> = {
  '/': { ikon: ClockIcon, w: 2 },
  '/kategori-solat': { ikon: LayersIcon, w: 0 },
  '/satu-pertiga-malam': { ikon: MoonStarIcon, w: 5 },
  '/arah-kiblat': { ikon: CompassIcon, w: 4 },
  '/qada-solat': { ikon: RotateCcwIcon, w: 3 },
  '/amalan': { ikon: ListChecksIcon, w: 1 },
  '/peringatan': { ikon: BookHeartIcon, w: 2 },
  '/tasbih': { ikon: SparklesIcon, w: 4 },
  '/istighfar': { ikon: WindIcon, w: 5 },
  '/rukun-solat': { ikon: BookOpenIcon, w: 0 },
  '/syarat-wajib-solat': { ikon: ScrollTextIcon, w: 1 },
  '/syarat-sah-solat': { ikon: ShieldCheckIcon, w: 2 },
  '/pembatal-solat': { ikon: BanIcon, w: 3 },
  '/tetapan': { ikon: SettingsIcon, w: 5 },
  '/apa-baru': { ikon: GiftIcon, w: 3 },
};

/**
 * Senarai navigasi yang dikongsi oleh bar sisi (desktop) dan laci (mudah alih).
 * Halaman semasa ditandakan dengan latar aksen lembut.
 */
export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { bahasa } = useBahasa();

  return (
    <nav className="flex flex-col gap-5">
      {NAV_GROUPS.map(group => (
        <div key={group.label.ms}>
          <p className="mb-1.5 pl-2 text-xs uppercase tracking-widest text-muted-foreground/60">
            {group.label[bahasa]}
          </p>
          <ul className="flex flex-col gap-0.5">
            {group.links.map(link => {
              const aktif = isActivePath(pathname, link.href);
              const { ikon: Ikon, w } = IKON[link.href] ?? { ikon: SparklesIcon, w: 0 };
              const p = palet(w);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={aktif ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-2xl px-2 py-1.5 text-sm transition-colors',
                      aktif
                        ? 'bg-accent font-semibold text-accent-foreground'
                        : 'text-foreground/80 hover:bg-muted hover:text-foreground'
                    )}
                  >
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-xl', p.lembut, p.teks)}>
                      <Ikon className="size-4" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 truncate">{link.label[bahasa]}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
