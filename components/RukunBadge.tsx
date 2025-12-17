import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

type RukunType = "fi'li" | 'qauli' | 'qalbi';

const BADGE_INFO = {
  "fi'li": "Fi'li ialah rukun yang melibatkan pergerakan atau perbuatan",
  "qauli": "Qauli ialah rukun melibatkan perkataan atau bacaan. Bacaan harus didengar oleh telinga sendiri.",
  "qalbi": "Qalbi ialah rukun melibatkan hati; niat & tertib",
};

export function RukunBadge({ type }: { type: RukunType }) {
  const [open, setOpen] = useState(false);
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen((prev) => !prev)}
            className="cursor-pointer text-xs capitalize"
          >
            <Badge variant="secondary">{type}</Badge>
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-2xs text-center">
          <p>{BADGE_INFO[type]}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
