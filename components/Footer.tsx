'use client';

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export default function Footer() {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowFeedbackDialog(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition text-left"
      >
        Beri Maklum Balas
      </button>
      <button
        onClick={() => setShowSupportDialog(true)}
        className="text-sm text-muted-foreground hover:text-foreground transition text-left"
      >
        Belanja Kopi
      </button>

      {/* Feedback dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Kongsi Maklum Balas Anda</DialogTitle>
            <DialogDescription>
              Bantu kami menambah baik MariSolat! Maklum balas dan cadangan anda
              amat kami hargai. Klik butang di bawah untuk membuka papan maklum
              balas di mana anda boleh berkongsi pendapat, melaporkan isu,
              atau mencadangkan ciri baharu.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => {
              window.open("https://insigh.to/b/marisolat", "_blank");
              setShowFeedbackDialog(false);
            }}
          >
            Buka Papan Maklum Balas
          </Button>
        </DialogContent>
      </Dialog>

      {/* Support dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Belanja Kopi</DialogTitle>
            <DialogDescription>
              Terima kasih kerana menyokong MariSolat! Imbas mana-mana kod QR di bawah.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* DuitNow */}
            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">DuitNow QR</p>
              <div className="relative w-48 sm:w-full aspect-square">
                <Image src="/duitnow-qr.png" alt="DuitNow QR" fill className="object-contain rounded-lg" />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Mana-mana aplikasi bank</p>
            </div>

            {/* Buy Me a Coffee */}
            <div className="flex flex-col items-center gap-2 border rounded-xl p-3">
              <p className="text-xs font-semibold">Buy Me a Coffee</p>
              <div className="relative w-48 sm:w-full aspect-square">
                <Image src="/buymeacoffee-qr.png" alt="Buy Me a Coffee QR" fill className="object-contain rounded-lg" />
              </div>
              <p className="text-[10px] text-muted-foreground text-center">Imbas atau klik <a href="https://buymeacoffee.com/mustafasyahmi" target="_blank" rel="noopener noreferrer" className="text-primary underline">di sini</a></p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
