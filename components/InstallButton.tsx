'use client';

import { useEffect, useState } from 'react';
import { DownloadIcon, ShareIcon, SquarePlusIcon } from 'lucide-react';
import { palet } from '@/lib/aksen';
import { cn } from '@/lib/utils';
import { useTeks } from '@/components/BahasaProvider';
import type { Kamus } from '@/lib/bahasa';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Ikon sebaris memberi pembaca sesuatu untuk dipadankan pada skrin, bukan
// penerangan tentang ikon untuk dihuraikan sendiri.
const LANGKAH_IOS: Kamus<React.ReactNode[]> = {
  ms: [
    <>
      Tekan <ShareIcon className="inline size-4 align-text-bottom" />{' '}
      <b className="font-semibold text-foreground">Share</b> pada bar bawah Safari.
    </>,
    <>
      Skrol ke bawah dan pilih <SquarePlusIcon className="inline size-4 align-text-bottom" />{' '}
      <b className="font-semibold text-foreground">Add to Home Screen</b>.
    </>,
    <>Tekan <b className="font-semibold text-foreground">Add</b> untuk mengesahkan.</>,
  ],
  en: [
    <>
      Tap <ShareIcon className="inline size-4 align-text-bottom" />{' '}
      <b className="font-semibold text-foreground">Share</b> in Safari&apos;s bottom bar.
    </>,
    <>
      Scroll down and choose <SquarePlusIcon className="inline size-4 align-text-bottom" />{' '}
      <b className="font-semibold text-foreground">Add to Home Screen</b>.
    </>,
    <>Tap <b className="font-semibold text-foreground">Add</b> to confirm.</>,
  ],
};

const ms = {
  pasang: 'Install MariSolat',
  huraian:
    'MariSolat terbuka skrin penuh tanpa bar pelayar, dengan ikonnya sendiri pada skrin utama. Safari tiada butang install, jadi ia dibuat melalui menu Kongsi.',
};
const en: typeof ms = {
  pasang: 'Install MariSolat',
  huraian:
    "MariSolat opens full screen without the browser bar, with its own icon on your home screen. Safari has no install button, so it's done through the Share menu.",
};
const TEKS = { ms, en };

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosDialog, setShowIosDialog] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // andaikan sudah diinstall sehingga disemak
  const t = useTeks(TEKS);
  const langkahIos = useTeks(LANGKAH_IOS);

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (standalone) return;

    // Pemeriksaan ini memerlukan window, jadi ia tidak boleh berlaku semasa
    // render pertama tanpa memecahkan penghidratan. Menetapkan keadaan di sini
    // ialah pembetulan sekali sahaja, bukan render bertingkat.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsStandalone(false);

    const ua = navigator.userAgent;
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) &&
      !(window as { MSStream?: unknown }).MSStream &&
      !/crios|fxios|opios|mercury/i.test(ua);

    if (isIOS) {
      setIsIos(true);
      return;
    }

    // Dahulunya pendengar ini hanya didaftarkan pada Android, jadi Chrome dan
    // Edge pada desktop tidak pernah melihat pilihan install walaupun ia
    // disokong sepenuhnya di sana. Setiap platform bukan iOS mendapatnya.
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (isStandalone) return null;
  if (!isIos && !deferredPrompt) return null;

  const install = async () => {
    if (isIos) {
      setShowIosDialog(true);
      return;
    }
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  return (
    <>
      <button
        onClick={install}
        className="flex items-center gap-2.5 rounded-2xl text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-w1-lembut text-w1">
          <DownloadIcon className="size-3.5" />
        </span>
        {t.pasang}
      </button>

      <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">{t.pasang}</DialogTitle>
            {/* Menyatakan sebab ada tiga langkah lebih berguna daripada
                menyuruh pembaca mengikut langkah yang sudah kelihatan. */}
            {/* Butang tidak pernah memberi sebab untuk mengetiknya. Baris
                pertama ialah sebab; baris kedua sebab ada tiga langkah. */}
            <DialogDescription className="leading-relaxed">
              {t.huraian}
            </DialogDescription>
          </DialogHeader>

          <ol className="flex flex-col gap-2">
            {langkahIos.map((langkah, i) => (
              <li key={i} className="flex items-start gap-3 rounded-2xl bg-muted/60 p-3 text-left">
                {/* Setiap langkah diberi warna palet sendiri. */}
                <span className={cn('angka-paparan flex size-8 shrink-0 items-center justify-center rounded-xl text-base', palet(i).lembut, palet(i).teks)}>{i + 1}</span>
                <span className="leading-relaxed text-muted-foreground">{langkah}</span>
              </li>
            ))}
          </ol>

          {/* Nama menu iOS kekal dalam bahasa Inggeris kerana itulah yang
              benar-benar tertera pada skrin. */}
        </DialogContent>
      </Dialog>
    </>
  );
}
