'use client';

import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { useTeks } from '@/components/BahasaProvider';

const ms = {
  tajuk: 'Buka dalam pelayar untuk log masuk',
  huraian:
    'Log masuk Google tidak berfungsi dalam pelayar dalaman ini. Salin pautan, kemudian buka MariSolat dalam Safari atau Chrome.',
  disalin: 'Pautan disalin',
  salin: 'Salin pautan',
};
const en: typeof ms = {
  tajuk: 'Open in your browser to sign in',
  huraian:
    "Google sign-in doesn't work in this in-app browser. Copy the link, then open MariSolat in Safari or Chrome.",
  disalin: 'Link copied',
  salin: 'Copy link',
};
const TEKS = { ms, en };

/**
 * Log masuk Google disekat di dalam pelayar dalaman aplikasi (Instagram,
 * Facebook, TikTok), jadi satu-satunya jalan keluar ialah membuka pautan
 * dalam pelayar sebenar.
 */
export default function InAppBrowserBanner() {
  const [disalin, setDisalin] = useState(false);
  const t = useTeks(TEKS);

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
    <div className="flex flex-col gap-4 rounded-3xl bg-amaran-lembut p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-amaran">
          <ExternalLink className="size-5" />
        </span>
        <div>
          <p className="font-semibold text-foreground">{t.tajuk}</p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {t.huraian}
          </p>
        </div>
      </div>
      <button
        onClick={salin}
        className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        {disalin ? t.disalin : t.salin}
      </button>
    </div>
  );
}
