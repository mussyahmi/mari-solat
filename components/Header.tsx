'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { Loader2Icon, MenuIcon, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';
import InstallButton from '@/components/InstallButton';
import CariMasjid from '@/components/CariMasjid';
import NavLinks from '@/components/NavLinks';
import ScrollableNav from '@/components/ScrollableNav';
import ButangAkaun from '@/components/ButangAkaun';
import { PERISTIWA_BUKA_MENU } from '@/components/BarBawah';
import { APP_VERSION } from '@/lib/version';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { KOD_BAHASA } from '@/lib/bahasa';

const ms = {
  bukaMenu: 'Buka menu',
  huraian: 'MariSolat — waktu solat Malaysia',
  keCerah: 'Tukar ke tema cerah',
  keGelap: 'Tukar ke tema gelap',
  tukarBahasa: 'Switch to English',
};
const en: typeof ms = {
  bukaMenu: 'Open menu',
  huraian: 'MariSolat — Malaysian prayer times',
  keCerah: 'Switch to light theme',
  keGelap: 'Switch to dark theme',
  tukarBahasa: 'Tukar ke Bahasa Melayu',
};
const TEKS = { ms, en };

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [laciBuka, setLaciBuka] = useState(false);
  const { bahasa, tukar } = useBahasa();
  const t = useTeks(TEKS);

  useEffect(() => setMounted(true), []);

  // Tab "Lagi" di bar bawah membuka laci yang sama.
  useEffect(() => {
    const buka = () => setLaciBuka(true);
    window.addEventListener(PERISTIWA_BUKA_MENU, buka);
    return () => window.removeEventListener(PERISTIWA_BUKA_MENU, buka);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 py-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 lg:px-10">
      <Link href="/" aria-label="MariSolat">
        <Logo />
      </Link>

      <div className="flex items-center gap-1">
      <Sheet open={laciBuka} onOpenChange={setLaciBuka}>
        <SheetTrigger asChild>
          {/* Pada telefon, tab "Lagi" di bawah menggantikan butang ini. */}
          <Button variant="ghost" size="sm" aria-label={t.bukaMenu} className="max-lg:hidden">
            <MenuIcon />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72">
          <SheetHeader>
            <SheetTitle asChild>
              <Link href="/" onClick={() => setLaciBuka(false)} aria-label="MariSolat" className="flex justify-center">
                <Logo tagline />
              </Link>
            </SheetTitle>
            <SheetDescription className="sr-only">{t.huraian}</SheetDescription>
          </SheetHeader>
          <ScrollableNav>
            <div className="px-4">
              <NavLinks onNavigate={() => setLaciBuka(false)} />
            </div>
          </ScrollableNav>
          <SheetFooter>
            <Separator />
            <div className="flex flex-col gap-2.5">
              <CariMasjid />
              <Footer />
              <InstallButton />
              <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Menunjukkan bahasa yang akan ditukar ke, bukan yang aktif — label
          ialah tindakan, sama seperti ikon tema di sebelahnya. */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => tukar(bahasa === 'ms' ? 'en' : 'ms')}
        aria-label={t.tukarBahasa}
        className="text-xs font-semibold tracking-wide"
      >
        {KOD_BAHASA[bahasa === 'ms' ? 'en' : 'ms']}
      </Button>

      {!mounted ? (
        <Button variant="ghost" size="sm" aria-hidden>
          <Loader2Icon className="animate-spin" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? t.keCerah : t.keGelap}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      )}

      {/* Avatar di sudut, bukan di antara dua ikon monokrom: ia satu-satunya
          elemen berwarna penuh di sini, jadi menyelitkannya di tengah
          menjadikannya sauh visual kepala dan memisahkan dua ikon yang
          sepatutnya berkumpul. Togol tema juga berpindah keluar dari sudut —
          ia ditetapkan sekali sahaja seumur hidup, jadi ia tidak sepatutnya
          memiliki slot paling mudah dicapai. */}
      <span className="ml-1">
        <ButangAkaun />
      </span>
      </div>
      </div>
    </header>
  );
}
