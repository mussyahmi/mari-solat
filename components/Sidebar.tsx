'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ChevronLeft, ChevronRight, Loader2Icon, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Footer from '@/components/Footer';
import { APP_VERSION } from '@/lib/version';

const NAV_LINKS = [
  { href: '/', label: 'Waktu Solat' },
  { href: '/arah-kiblat', label: 'Arah Kiblat' },
  { href: '/satu-pertiga-malam', label: 'Satu Pertiga Malam' },
  { href: '/kategori-solat', label: 'Kategori Waktu' },
  { href: '/rukun-solat', label: 'Rukun Solat' },
  { href: '/syarat-wajib-solat', label: 'Syarat Wajib Solat' },
  { href: '/syarat-sah-solat', label: 'Syarat Sah Solat' },
  { href: '/pembatal-solat', label: 'Pembatal Solat' },
  { href: '/tetapan', label: 'Tetapan' },
];

export default function Sidebar() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (localStorage.getItem('msolat_sidebar_collapsed') === 'true') {
      setCollapsed(true);
    }
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem('msolat_sidebar_collapsed', String(next));
  };

  return (
    <aside
      className={`hidden lg:flex lg:flex-col lg:shrink-0 border-r border-border bg-background h-screen sticky top-0 overflow-hidden transition-[width] duration-200 ${
        collapsed ? 'lg:w-12' : 'lg:w-[260px]'
      }`}
    >
      {collapsed ? (
        <div className="flex flex-col items-center pt-5">
          <button
            onClick={toggle}
            className="p-2 rounded-md hover:bg-muted transition text-muted-foreground hover:text-foreground"
            aria-label="Buka sidebar"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col h-full p-6 min-w-[260px]">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="text-xl font-bold">MariSolat</Link>
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

          <nav className="flex flex-col gap-1.5 mb-6">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-muted-foreground hover:text-foreground transition"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mt-auto pt-4 border-t border-border space-y-1">
            <Footer />
            <p className="text-xs text-muted-foreground text-center pt-2">v{APP_VERSION}</p>
          </div>
        </div>
      )}
    </aside>
  );
}
