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
    const ios = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua);
    setIsIos(ios);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
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
        Install App
      </button>

      <Dialog open={showIosDialog} onOpenChange={setShowIosDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Install MariSolat</DialogTitle>
            <DialogDescription>
              Follow these steps to install MariSolat on your iPhone or iPad.
            </DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">1.</span>
              <span>Tap the <span className="font-medium text-foreground">Share</span> icon (box with an arrow pointing up) in Safari&apos;s bottom bar.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">2.</span>
              <span>Scroll down and tap <span className="font-medium text-foreground">&ldquo;Add to Home Screen&rdquo;</span>.</span>
            </li>
            <li className="flex gap-3">
              <span className="shrink-0 font-semibold text-foreground">3.</span>
              <span>Tap <span className="font-medium text-foreground">Add</span> to confirm.</span>
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}
