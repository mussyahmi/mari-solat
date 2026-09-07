'use client';

import { useEffect, useState } from 'react';
import { ShareIcon, SquarePlusIcon } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Ikon sebaris memberi pembaca sesuatu untuk dipadankan pada skrin, bukan
// penerangan tentang ikon untuk dihuraikan sendiri.
const LANGKAH_IOS = [
  <>
    Tekan <ShareIcon className="inline size-4 align-text-bottom" />{' '}
    <b className="font-semibold text-foreground">Share</b> pada bar bawah Safari.
  </>,
  <>
    Skrol ke bawah dan pilih <SquarePlusIcon className="inline size-4 align-text-bottom" />{' '}
    <b className="font-semibold text-foreground">Add to Home Screen</b>.
  </>,
  <>Tekan <b className="font-semibold text-foreground">Add</b> untuk mengesahkan.</>,
];

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosDialog, setShowIosDialog] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // andaikan sudah diinstall sehingga disemak

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
        className="text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        Install MariSolat
      </button>

      <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="paparan text-2xl">Install MariSolat</DialogTitle>
            {/* Menyatakan sebab ada tiga langkah lebih berguna daripada
                menyuruh pembaca mengikut langkah yang sudah kelihatan. */}
            {/* Butang tidak pernah memberi sebab untuk mengetiknya. Baris
                pertama ialah sebab; baris kedua sebab ada tiga langkah. */}
            <DialogDescription className="leading-relaxed">
              MariSolat terbuka skrin penuh tanpa bar pelayar, dengan ikonnya
              sendiri pada skrin utama. Safari tiada butang install, jadi ia
              dibuat melalui menu Kongsi.
            </DialogDescription>
          </DialogHeader>

          <ol className="divide-y divide-border/50 border-t border-border/50">
            {LANGKAH_IOS.map((langkah, i) => (
              <li key={i} className="flex gap-4 py-4 text-left">
                <span className="angka-paparan w-4 shrink-0 text-lg text-muted-foreground">{i + 1}</span>
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
