'use client';

import { Loader2Icon, MenuIcon, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "./ui/sheet";
import { APP_VERSION } from "@/lib/version";
import Footer from "./Footer";
import { Separator } from "./ui/separator";

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex w-full items-center justify-between px-4 py-3 sticky top-0 bg-background border-b border-border z-50 lg:hidden">
      <div className="flex items-center gap-2">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant={"ghost"} size={"sm"}>
              <MenuIcon />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetHeader>
              <SheetTitle>MariSolat</SheetTitle>
              <SheetDescription>
                Pantau waktu solat harian di Malaysia termasuk tarikh Miladi & Hijri, jadual lengkap solat untuk semua zon dengan MariSolat.
              </SheetDescription>
            </SheetHeader>
            <nav className="grid flex-1 auto-rows-min gap-3 px-4">
              <Link href="/" className="text-sm text-muted-foreground">Waktu Solat</Link>
              <Link href="/arah-kiblat" className="text-sm text-muted-foreground">Arah Kiblat</Link>
              <Link href="/satu-pertiga-malam" className="text-sm text-muted-foreground">Satu Pertiga Malam</Link>
              <Link href="/kategori-solat" className="text-sm text-muted-foreground">Kategori Waktu</Link>
              <Link href="/rukun-solat" className="text-sm text-muted-foreground">Rukun Solat</Link>
              <Link href="/syarat-wajib-solat" className="text-sm text-muted-foreground">Syarat Wajib Solat</Link>
              <Link href="/syarat-sah-solat" className="text-sm text-muted-foreground">Syarat Sah Solat</Link>
              <Link href="/pembatal-solat" className="text-sm text-muted-foreground">Pembatal Solat</Link>
              <Link href="/tetapan" className="text-sm text-muted-foreground">Tetapan</Link>
            </nav>
            <SheetFooter>
              <Separator />
              <Footer />
              <div className="text-xs opacity-60 text-center">
                v{APP_VERSION}
              </div>
            </SheetFooter>
          </SheetContent>
        </Sheet>
        <Link className="text-xl font-bold text-black dark:text-zinc-50" href={"/"}>MariSolat</Link>
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