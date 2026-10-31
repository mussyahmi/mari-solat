'use client';

import { useState } from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, CoffeeIcon, ExternalLinkIcon, MessageCircleIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useTeks } from "@/components/BahasaProvider";

/**
 * Pautan sokongan di kaki laci navigasi.
 *
 * Maklum balas dahulunya membuka dialog yang tujuan tunggalnya ialah
 * menerangkan butang di dalamnya, kemudian membuka pautan luar — dua ketikan
 * untuk satu tindakan. Ia kini pautan terus. Belanja kopi kekal sebagai dialog
 * kerana kod QR memang perlu dipaparkan.
 */

const ms = {
  bankApa: 'Mana-mana aplikasi bank',
  bukaPautan: 'Buka pautan',
  altQr: (l: string) => `Kod QR ${l}`,
  maklumBalas: 'Beri maklum balas',
  belanjaKopi: 'Belanja kopi',
  huraian: 'MariSolat percuma dan tiada iklan. Kalau ia berguna kepada anda, imbas mana-mana kod di bawah.',
  sebelum: 'Kod sebelumnya',
  seterusnya: 'Kod seterusnya',
  tunjuk: (l: string) => `Tunjuk ${l}`,
};
const en: typeof ms = {
  bankApa: 'Any banking app',
  bukaPautan: 'Open link',
  altQr: l => `${l} QR code`,
  maklumBalas: 'Send feedback',
  belanjaKopi: 'Buy me a coffee',
  huraian: "MariSolat is free and has no ads. If it's useful to you, scan either code below.",
  sebelum: 'Previous code',
  seterusnya: 'Next code',
  tunjuk: l => `Show ${l}`,
};
const TEKS = { ms, en };

type KodQr = { label: string; src: string; alt: string; kapsyen: React.ReactNode };

const senaraiKodQr = (t: typeof ms): KodQr[] => [
  {
    label: 'DuitNow QR',
    src: '/duitnow-qr.png',
    alt: t.altQr('DuitNow'),
    kapsyen: <span className="text-sm text-muted-foreground">{t.bankApa}</span>,
  },
  {
    label: 'Buy Me a Coffee',
    src: '/buymeacoffee-qr.png',
    alt: t.altQr('Buy Me a Coffee'),
    kapsyen: (
      <a
        href="https://buymeacoffee.com/mustafasyahmi"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-primary transition-opacity hover:opacity-80"
      >
        {t.bukaPautan}
        <ExternalLinkIcon className="size-3.5" />
      </a>
    ),
  },
];

export default function Footer() {
  const [bukaSokongan, setBukaSokongan] = useState(false);
  const [indeks, setIndeks] = useState(0);
  const t = useTeks(TEKS);
  const KOD_QR = senaraiKodQr(t);

  const aktif = KOD_QR[indeks];

  return (
    <>
      <a
        href="https://insigh.to/b/marisolat"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 rounded-2xl text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-w6-lembut text-w6">
          <MessageCircleIcon className="size-3.5" />
        </span>
        {t.maklumBalas}
        <ExternalLinkIcon className="size-3.5" />
      </a>
      <button
        onClick={() => setBukaSokongan(true)}
        className="flex items-center gap-2.5 rounded-2xl text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-w5-lembut text-w5">
          <CoffeeIcon className="size-3.5" />
        </span>
        {t.belanjaKopi}
      </button>

      <Dialog open={bukaSokongan} onOpenChange={setBukaSokongan}>
        <DialogContent className="max-w-sm rounded-3xl sm:!max-w-2xl">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">{t.belanjaKopi}</DialogTitle>
            {/* Kod QR bank membawa nama sebenar seorang individu, jadi "kami"
                di sini tidak pernah jujur. */}
            <DialogDescription className="leading-relaxed">
              {t.huraian}
            </DialogDescription>
          </DialogHeader>

          {/* Telefon: satu kod pada satu masa, supaya ia cukup besar untuk
              diimbas oleh peranti lain tanpa dialog menjadi terlalu tinggi. */}
          <div className="flex flex-col items-center gap-4 pt-2 sm:hidden">
            <div className="w-full text-center">
              <p className="text-sm font-semibold text-muted-foreground">{aktif.label}</p>
              <div className="relative mx-auto mt-2 aspect-square w-full max-w-[17rem] overflow-hidden rounded-2xl">
                <Image src={aktif.src} alt={aktif.alt} fill className="object-contain" draggable={false} />
              </div>
              <div className="mt-3">{aktif.kapsyen}</div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIndeks(i => Math.max(0, i - 1))}
                disabled={indeks === 0}
                aria-label={t.sebelum}
                className="rounded-full bg-muted p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
              >
                <ChevronLeftIcon className="size-4" />
              </button>
              <div className="flex">
                {KOD_QR.map((kod, i) => (
                  <button
                    key={kod.label}
                    onClick={() => setIndeks(i)}
                    aria-label={t.tunjuk(kod.label)}
                    aria-current={i === indeks}
                    className="grid place-items-center p-2 pointer-coarse:p-3"
                  >
                    {/* Titik kekal kecil; kawasan ketikan di sekelilingnya tidak. */}
                    <span
                      aria-hidden
                      className={`size-2 rounded-full transition-colors ${
                        i === indeks ? 'bg-primary' : 'bg-muted-foreground/40'
                      }`}
                    />
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIndeks(i => Math.min(KOD_QR.length - 1, i + 1))}
                disabled={indeks === KOD_QR.length - 1}
                aria-label={t.seterusnya}
                className="rounded-full bg-muted p-1.5 transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-30"
              >
                <ChevronRightIcon className="size-4" />
              </button>
            </div>
          </div>

          {/* Skrin lebar: kedua-duanya muat sebelah-menyebelah, jadi tiada
              sebab untuk menyembunyikan salah satu di belakang satu ketikan. */}
          <div className="hidden gap-8 pt-2 sm:grid sm:grid-cols-2">
            {KOD_QR.map(kod => (
              <div key={kod.label}>
                <p className="text-sm font-semibold text-muted-foreground">{kod.label}</p>
                <div className="relative mt-2 aspect-square w-full overflow-hidden rounded-2xl">
                  <Image src={kod.src} alt={kod.alt} fill className="object-contain" draggable={false} />
                </div>
                <div className="mt-3">{kod.kapsyen}</div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
