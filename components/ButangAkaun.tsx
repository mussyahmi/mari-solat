'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserRoundIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAkaun } from '@/components/AkaunProvider';

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

  if (memuat) {
    return (
      <Button variant="ghost" size="sm" aria-hidden>
        <span className="size-5 rounded-full bg-muted" />
      </Button>
    );
  }

  if (!user) {
    return (
      <Button variant="ghost" size="sm" onClick={masuk} aria-label="Log masuk">
        <UserRoundIcon />
      </Button>
    );
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setBuka(true)} aria-label="Akaun anda">
        {user.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.photoURL} alt="" className="size-5 rounded-full" referrerPolicy="no-referrer" />
        ) : (
          <UserRoundIcon />
        )}
      </Button>

      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">{alias || 'Akaun anda'}</DialogTitle>
            <DialogDescription>
              Nama sebenar anda tidak pernah dipaparkan kepada pengguna lain.
            </DialogDescription>
          </DialogHeader>

          <div className="divide-y divide-border/50 border-t border-border/50">
            <Link
              href="/qada-solat"
              onClick={() => setBuka(false)}
              className="flex items-baseline justify-between gap-6 py-4 transition-colors hover:text-primary"
            >
              <span>Qada solat</span>
              <span className="shrink-0 text-sm text-muted-foreground">
                {bakiQada === null ? 'Belum bermula' : `${bakiQada} baki`}
              </span>
            </Link>
            <button
              onClick={() => { setBuka(false); keluar(); }}
              className="w-full py-4 text-left text-muted-foreground transition-colors hover:text-foreground"
            >
              Log keluar
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
