'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from 'next-themes';
import { ChevronLeft, ChevronRight, Loader2Icon, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import InstallButton from '@/components/InstallButton';
import { APP_VERSION } from '@/lib/version';

const NAV_GROUPS = [
  {
    label: 'Waktu',
    links: [
      { href: '/', label: 'Waktu Solat' },
      { href: '/arah-kiblat', label: 'Arah Kiblat' },
      { href: '/satu-pertiga-malam', label: 'Satu Pertiga Malam' },
      { href: '/kategori-solat', label: 'Kategori Waktu' },
      { href: '/qada-solat', label: 'Qada Solat' },
    ],
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
];

export default function Sidebar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('msolat_sidebar_collapsed') === 'true') {
      setCollapsed(true);
    }
  }, []);

  const openNearbyMasjid = () => {
    if (coords) {
      window.open(`https://www.google.com/maps/search/masjid/@${coords.lat},${coords.lng},15z`, '_blank');
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        window.open(`https://www.google.com/maps/search/masjid/@${c.latitude},${c.longitude},15z`, '_blank');
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('msolat_sidebar_collapsed', String(next));
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:shrink-0 border-r border-border/60 bg-background/95 backdrop-blur-sm h-screen sticky top-0 overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'lg:w-12' : 'lg:w-[260px]'
      }`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center pt-5 gap-3">
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Buka sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
          <Link href="/">
            <Image src="/logo-icon.png" alt="MariSolat" width={28} height={28} className="object-contain rounded-sm" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col h-full p-6 min-w-[260px]">
          <div className="flex items-center justify-between mb-10">
            <Link href="/">
              <Image src="/logo-horizontal.png" alt="MariSolat" width={120} height={40} className="object-contain rounded-sm" />
            </Link>
            <div className="flex items-center gap-0.5">
              {!mounted ? (
                <Button variant="ghost" size="sm"><Loader2Icon className="animate-spin" /></Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}>
                  {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={toggle} aria-label="Tutup sidebar">
                <ChevronLeft className="size-4" />
              </Button>
            </div>
          </div>

          <nav className="flex flex-col gap-6 mb-6">
            {NAV_GROUPS.map(group => (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/35 mb-2.5">{group.label}</p>
                <div className="flex flex-col gap-1.5">
                  {group.links.map(link => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/35 mb-2.5">Lain-lain</p>
              <div className="flex flex-col gap-1.5">
                <Link href="/tetapan" className="text-sm text-muted-foreground hover:text-foreground transition-colors py-0.5">Tetapan</Link>
              </div>
            </div>
          </nav>

          <div className="mt-auto border-t border-border/50 pt-5 space-y-2.5">
            <button
              onClick={openNearbyMasjid}
              className="text-sm text-muted-foreground hover:text-foreground transition text-left"
            >
              Cari Masjid Berdekatan
            </button>
            <Footer />
            <InstallButton />
            <p className="text-[10px] text-muted-foreground/40">v{APP_VERSION}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
