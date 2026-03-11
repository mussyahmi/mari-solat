'use client';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useState } from "react";

type RukunType = "fi'li" | 'qauli' | 'qalbi';

const TYPE_META: Record<RukunType, { label: string; description: string; className: string }> = {
  "fi'li": {
    label: "Fi'li",
    description: "Perbuatan",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  qauli: {
    label: "Qauli",
    description: "Diucap dengan lidah",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  qalbi: {
    label: "Qalbi",
    description: "Diingat dalam hati",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
};

export function RukunBadge({ type }: { type: RukunType }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_META[type];
  return (
    <TooltipProvider>
      <Tooltip open={open} onOpenChange={setOpen}>
        <TooltipTrigger asChild>
          <button
            onClick={() => setOpen(prev => !prev)}
            className={`text-[11px] font-medium px-2 py-0.5 rounded shrink-0 ${meta.className}`}
          >
            {meta.label}
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-56 text-center">
          <p>{meta.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { TYPE_META };
export type { RukunType };
