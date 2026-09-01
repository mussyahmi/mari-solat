'use client';

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const INITIAL_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.0.0';

// Bandingkan semver: pulangkan true hanya jika `remote` lebih baru daripada
// `current`. Ini elak toast berulang kalau /version.json tertinggal di
// belakang bundle yang sedang berjalan (cth. deploy yang tak jana semula
// version.json) — keadaan itu tak boleh dibaiki dengan muat semula.
function isNewer(remote: string, current: string): boolean {
  const parse = (v: string) =>
    v.split('.').map((n) => Number.parseInt(n, 10));
  const r = parse(remote);
  const c = parse(current);
  if (r.some(Number.isNaN) || c.some(Number.isNaN)) return false;
  for (let i = 0; i < Math.max(r.length, c.length); i++) {
    const a = r[i] ?? 0;
    const b = c[i] ?? 0;
    if (a !== b) return a > b;
  }
  return false;
}

export default function UpdatePrompt() {
  const shown = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (shown.current) return;
      try {
        const res = await fetch('/version.json', { cache: 'no-store' });
        const { version } = await res.json();
        if (isNewer(version, INITIAL_VERSION) && !shown.current) {
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
