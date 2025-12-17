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
    <header className="flex w-full items-center justify-between p-5 sticky top-0 z-50">
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
              <Link href="/">Waktu Solat</Link>
              <Link href="/rukun-solat">Rukun Solat</Link>
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
          <Button variant={"outline"} size={"sm"}><Loader2Icon className='animate-spin' /></Button>
          :
          <Button variant={"outline"} size={"sm"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</Button>
        }
      </div>
    </header>
  );
}