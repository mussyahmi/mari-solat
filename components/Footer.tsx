'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function Footer() {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  return (
    <div className="flex flex-col">
      {/* Feedback Button & Dialog */}
      <Button variant="link" className="p-0" onClick={() => setShowFeedbackDialog(true)}>
        Beri Maklum Balas
      </Button>

      <Dialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sebelum Anda Teruskan</DialogTitle>
            <DialogDescription>
              Siaran di Insighto tidak boleh diedit selepas diterbitkan.
              Jika anda ingin memberi maklum balas atau mencadangkan penambahbaikan,
              anda boleh melakukannya di bawah.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button
              onClick={() =>
                window.open("https://insigh.to/b/marisolat", "_blank")
              }
            >
              Buka Papan Maklum Balas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Buy Me a Coffee Button */}
      <Button
        variant="link"
        className="p-0"
        onClick={() =>
          window.open("https://buymeacoffee.com/mustafasyahmi", "_blank")
        }
      >
        Belanja Saya Kopi
      </Button>
    </div>
  );
}
