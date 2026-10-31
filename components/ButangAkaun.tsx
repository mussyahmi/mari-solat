'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRightIcon, LogOutIcon, RotateCcwIcon, UserRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAkaun } from '@/components/AkaunProvider';
import { useTeks } from '@/components/BahasaProvider';

const ms = {
  logMasuk: 'Log masuk',
  akaunAnda: 'Akaun anda',
  privasi: 'Nama sebenar anda tidak pernah dipaparkan kepada pengguna lain.',
  qada: 'Qada solat',
  belumBermula: 'Belum bermula',
  baki: (n: number) => `${n} baki`,
  logKeluar: 'Log keluar',
};
const en: typeof ms = {
  logMasuk: 'Sign in',
  akaunAnda: 'Your account',
  privasi: 'Your real name is never shown to other users.',
  qada: 'Qada prayers',
  belumBermula: 'Not started',
  baki: n => `${n} left`,
  logKeluar: 'Sign out',
};
const TEKS = { ms, en };

/**
 * Akaun dalam kepala, bukan terkubur di dalam /qada-solat.
 *
 * Ketika log keluar ia satu ketikan untuk log masuk. Ketika log masuk ia
 * memaparkan avatar — supaya "sudah log masuk" menjadi keadaan yang kelihatan
 * dan bukan sesuatu yang perlu ditemui semula.
 */
export default function ButangAkaun() {
  const { user, alias, bakiQada, memuat, masuk, keluar } = useAkaun();
  const [buka, setBuka] = useState(false);
  const t = useTeks(TEKS);

  if (memuat) {
    return (
      <Button variant="ghost" size="sm" aria-hidden>
        <span className="size-5 rounded-full bg-muted" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" onClick={masuk} aria-label={t.logMasuk}>
        <UserRoundIcon />
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setBuka(true)} aria-label={t.akaunAnda}>
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="size-5 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserRoundIcon />
        )}
      </Button>

      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">{alias || t.akaunAnda}</DialogTitle>
            <DialogDescription>
              {t.privasi}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Link
              href="/qada-solat"
              onClick={() => setBuka(false)}
              className="flex items-center gap-3 rounded-2xl bg-muted/60 p-3 transition-colors hover:bg-muted"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-w3-lembut text-w3">
                <RotateCcwIcon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{t.qada}</span>
                <span className="block text-sm text-muted-foreground">
                  {bakiQada === null ? t.belumBermula : t.baki(bakiQada)}
                </span>
              </span>
              <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground" />
            </Link>
            <button
              onClick={() => { setBuka(false); keluar(); }}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-muted px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOutIcon className="size-4" />
              {t.logKeluar}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
