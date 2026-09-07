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
import { APP_VERSION } from '@/lib/version';

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [laciBuka, setLaciBuka] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="sticky top-0 z-50 w-full shrink-0 py-4">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-5 lg:px-10">
      <Link href="/" aria-label="MariSolat">
        <Logo />
      </Link>

      <div className="flex items-center gap-1">
      <Sheet open={laciBuka} onOpenChange={setLaciBuka}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="sm" aria-label="Buka menu">
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
            <SheetDescription className="sr-only">MariSolat — waktu solat Malaysia</SheetDescription>
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

      

      {!mounted ? (
        <Button variant="ghost" size="sm" aria-hidden>
          <Loader2Icon className="animate-spin" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          aria-label={resolvedTheme === 'dark' ? 'Tukar ke tema cerah' : 'Tukar ke tema gelap'}
        >
          {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>
      )}
      </div>
      </div>
    </header>
  );
}
