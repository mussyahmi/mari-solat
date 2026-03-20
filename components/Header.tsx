'use client';

import { Loader2Icon, MenuIcon, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { APP_VERSION } from "@/lib/version";
import Footer from "./Footer";
import { Separator } from "./ui/separator";

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    setMounted(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => setCoords({ lat: coords.latitude, lng: coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  return (
    <header className="relative flex w-full items-center justify-between px-4 py-3 sticky top-0 bg-background border-b border-border z-50 lg:hidden">
      <div className="flex items-center">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant={"ghost"} size={"sm"}>
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle asChild>
                <Link href="/">
                  <Image src="/logo-stacked.png" alt="MariSolat" width={80} height={80} className="object-contain rounded-md mx-auto" />
                </Link>
              </SheetTitle>
              <SheetDescription className="sr-only">MariSolat — Waktu Solat Malaysia</SheetDescription>
            </SheetHeader>
            <nav className="flex flex-col gap-5 px-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-1.5">Waktu</p>
                <div className="flex flex-col gap-3">
                  <Link href="/" className="text-sm text-muted-foreground">Waktu Solat</Link>
                  <Link href="/arah-kiblat" className="text-sm text-muted-foreground">Arah Kiblat</Link>
                  <Link href="/satu-pertiga-malam" className="text-sm text-muted-foreground">Satu Pertiga Malam</Link>
                  <Link href="/kategori-solat" className="text-sm text-muted-foreground">Kategori Waktu</Link>
                  <Link href="/qada-solat" className="text-sm text-muted-foreground">Qada Solat</Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-1.5">Ilmu Solat</p>
                <div className="flex flex-col gap-3">
                  <Link href="/rukun-solat" className="text-sm text-muted-foreground">Rukun Solat</Link>
                  <Link href="/syarat-wajib-solat" className="text-sm text-muted-foreground">Syarat Wajib Solat</Link>
                  <Link href="/syarat-sah-solat" className="text-sm text-muted-foreground">Syarat Sah Solat</Link>
                  <Link href="/pembatal-solat" className="text-sm text-muted-foreground">Pembatal Solat</Link>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/40 mb-1.5">Lain-lain</p>
                <div className="flex flex-col gap-3">
                  <Link href="/tetapan" className="text-sm text-muted-foreground">Tetapan</Link>
                </div>
              </div>
            </nav>
            <SheetFooter>
              <Separator />
              <div className="space-y-2">
                {coords && (
                  <button
                    onClick={() => window.open(`https://www.google.com/maps/search/masjid/@${coords.lat},${coords.lng},15z`, '_blank')}
                    className="text-sm text-muted-foreground hover:text-foreground transition text-left"
                  >
                    Cari Masjid Berdekatan
                  </button>
                )}
                <Footer />
                <p className="text-[10px] text-muted-foreground/40">v{APP_VERSION}</p>
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      <div className="absolute left-1/2 -translate-x-1/2">
        <Link href="/">
          <Image src="/logo-horizontal.png" alt="MariSolat" width={120} height={32} className="object-contain rounded-sm" />
        </Link>
      </div>

      <div className='flex items-center justify-center'>
        {!mounted ?
          <Button variant={"ghost"} size={"sm"}><Loader2Icon className='animate-spin' /></Button>
          :
          <Button variant={"ghost"} size={"sm"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</Button>
        }
      </div>
    </header>
  );
}