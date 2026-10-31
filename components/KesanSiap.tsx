'use client';

import { useEffect, useRef } from 'react';
import { getarSiap } from '@/lib/getar';

/**
 * Getaran "selesai!" apabila sesuatu ditanda. Ia hanya berlaku pada saat
 * keadaan bertukar daripada belum kepada selesai — bukan semasa halaman
 * dibuka dengan item yang sudah siap.
 */
export function useGetarSiap(siap: boolean) {
  const dahulu = useRef(siap);
  useEffect(() => {
    if (siap && !dahulu.current) getarSiap();
    dahulu.current = siap;
  }, [siap]);
}
