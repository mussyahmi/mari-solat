'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NAV_GROUPS, isActivePath } from '@/lib/nav';

/**
 * Senarai navigasi yang dikongsi oleh bar sisi (desktop) dan laci (mudah alih).
 * Halaman semasa ditandakan dengan palang aksen di tepi kiri.
 */
export default function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-7">
      {NAV_GROUPS.map(group => (
        <div key={group.label}>
          <p className="mb-2 pl-3 text-xs text-muted-foreground">{group.label}</p>
          <ul className="flex flex-col">
            {group.links.map(link => {
              const aktif = isActivePath(pathname, link.href);
              return (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={onNavigate}
                    aria-current={aktif ? 'page' : undefined}
                    className={`-ml-px flex border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                      aktif
                        ? 'border-primary font-semibold text-foreground'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                    }`}
                  >
                    {link.label}
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
