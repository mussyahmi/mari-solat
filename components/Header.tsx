'use client';

import { Loader2Icon, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="flex w-full items-center justify-between p-5 sticky top-0 bg-zinc-50 dark:bg-zinc-900 z-50">
      <Link className="text-xl font-bold text-black dark:text-zinc-50" href={"/"}>JomSolat</Link>
      <div className='flex items-center justify-center gap-2'>
        {!mounted ?
          <Button size={"sm"}><Loader2Icon className='animate-spin' /></Button>
          :
          <Button size={"sm"} onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>{resolvedTheme === "dark" ? <Sun /> : <Moon />}</Button>
        }
      </div>
    </header>
  );
}