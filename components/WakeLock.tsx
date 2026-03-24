'use client';

import { useEffect } from 'react';

export default function WakeLock() {
  useEffect(() => {
    if (!('wakeLock' in navigator)) return;

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.matchMedia('(display-mode: fullscreen)').matches;

    if (!isStandalone) return;

    let lock: WakeLockSentinel | null = null;

    const acquire = async () => {
      try {
        lock = await navigator.wakeLock.request('screen');
      } catch {
        // silently ignore — device may be low battery etc.
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') acquire();
    };

    acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      lock?.release();
    };
  }, []);

  return null;
}
