'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Log masuk Google disekat di dalam pelayar dalaman aplikasi (Instagram,
 * Facebook, TikTok), jadi satu-satunya jalan keluar ialah membuka pautan
 * dalam pelayar sebenar.
 */
export default function InAppBrowserBanner() {
  const [disalin, setDisalin] = useState(false);

  const salin = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard API disekat dalam sesetengah pelayar dalaman.
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setDisalin(true);
    setTimeout(() => setDisalin(false), 2000);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amaran/35 bg-amaran/10 p-4">
      <div className="flex items-start gap-3">
        <ExternalLink className="mt-0.5 size-5 shrink-0 text-amaran" />
        <div>
          <p className="font-semibold text-foreground">Buka dalam pelayar untuk log masuk</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            Log masuk Google tidak berfungsi dalam pelayar dalaman ini. Salin pautan, kemudian buka
            MariSolat dalam Safari atau Chrome.
          </p>
        </div>
      </div>
      <button
        onClick={salin}
        className="inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {disalin ? 'Pautan disalin' : 'Salin pautan'}
      </button>
    </div>
  );
}
