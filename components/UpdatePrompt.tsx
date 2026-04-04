'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INITIAL_VERSION = process.env.NEXT_PUBLIC_BUILD_TIME ?? 'unknown';

export default function UpdatePrompt() {
  const shown = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (shown.current) return;
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        const { version } = await res.json();
        if (version !== INITIAL_VERSION && !shown.current) {
          shown.current = true;
          toast('Versi baru tersedia', {
            description: 'Muat semula untuk mendapatkan kemaskini terbaru.',
            duration: Infinity,
            action: {
              label: 'Muat Semula',
              onClick: () => window.location.reload(),
            },
          });
        }
      } catch {
        // ignore network errors
      }
    };

    const interval = setInterval(check, POLL_INTERVAL);

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
