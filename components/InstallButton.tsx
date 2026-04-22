'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function InstallButton() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosDialog, setShowIosDialog] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // assume installed until checked

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);

    if (standalone) return;

    setIsStandalone(false);

    const ua = navigator.userAgent;
    const isAndroid = /Android/i.test(ua);
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) &&
      !(window as { MSStream?: unknown }).MSStream &&
      !/crios|fxios|opios|mercury/i.test(ua);

    if (isAndroid) {
      const handler = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };
      window.addEventListener('beforeinstallprompt', handler);
      return () => window.removeEventListener('beforeinstallprompt', handler);
    }

    if (isIOS) setIsIos(true);
  }, []);

  if (isStandalone) return null;
  if (!isIos && !deferredPrompt) return null;

  const handleInstall = async () => {
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
        onClick={handleInstall}
        className="text-sm text-muted-foreground hover:text-foreground transition text-left"
      >
        Install MariSolat
      </button>

      <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install MariSolat</DialogTitle>
            <DialogDescription>
              Ikuti langkah berikut untuk install MariSolat pada iPhone atau iPad anda.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">1.</span>
              <span>Tekan ikon <span className="font-medium text-foreground">Share</span> (kotak dengan anak panah ke atas) di bar bawah Safari.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">2.</span>
              <span>Skrol ke bawah dan pilih <span className="font-medium text-foreground">&ldquo;Add to Home Screen&rdquo;</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">3.</span>
              <span>Tekan <span className="font-medium text-foreground">Add</span> untuk mengesahkan.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
