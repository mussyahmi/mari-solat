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
import { Separator } from "./ui/separator";

export default function Footer() {
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

  return (
    <footer className="flex justify-center bg-zinc-50 dark:bg-zinc-900 space-x-3 items-center">
      {/* Feedback Button & Dialog */}
      <Button variant="ghost" onClick={() => setShowFeedbackDialog(true)}>
        Give Feedback
      </Button>

      <Dialog
        open={showFeedbackDialog}
        onOpenChange={setShowFeedbackDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before You Continue</DialogTitle>
            <DialogDescription>
              Posts on Insighto cannot be edited after they are published.
              If you want to give feedback or request improvements, you can do so below.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-end space-x-2">
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={() =>
                window.open("https://insigh.to/b/marisolat", "_blank")
              }
            >
              Open Feedback Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <span>|</span>

      {/* Buy Me a Coffee Button */}
      <Button
        variant="ghost"
        onClick={() =>
          window.open("https://buymeacoffee.com/mustafasyahmi", "_blank")
        }
      >
        Buy Me a Coffee
      </Button>
    </footer>
  );
}
