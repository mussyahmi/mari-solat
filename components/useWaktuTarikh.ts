'use client';

import { useEffect, useState } from 'react';
import { binaWaktu, fetchSolat, type WaktuSolat } from '@/lib/solat';
import { tarikhKe } from '@/lib/amalan';

const simpanan = new Map<string, WaktuSolat>();

const zonTersimpan = () => {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('msolat_zone_code'); } catch { return null; }
};

/**
 * Waktu solat bagi zon tersimpan pada satu tarikh (YYYY-MM-DD). Jejak Ibadah
 * memerlukannya untuk sebarang hari yang dipilih, bukan hari ini sahaja.
 * Disimpan dalam ingatan kerana waktu sesuatu hari tidak berubah.
 */
export function useWaktuTarikh(s: string) {
  const zon = zonTersimpan();
  const kunci = zon ? `${zon}:${s}` : null;
  // Hanya digunakan untuk memaksa lukis semula selepas ambilan selesai.
  const [, setSiap] = useState(0);

  useEffect(() => {
    if (!zon || !kunci || simpanan.has(kunci)) return;
    let batal = false;
    fetchSolat(zon, tarikhKe(s))
      .then(d => {
        simpanan.set(kunci, binaWaktu(d.prayerTime));
        if (!batal) setSiap(n => n + 1);
      })
      .catch(() => { /* tiada waktu — kad dipaparkan tanpa jam */ });
    return () => { batal = true; };
  }, [zon, kunci, s]);

  return kunci ? simpanan.get(kunci) ?? null : null;
}
