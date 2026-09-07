'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';
import { WARNA_TEMA } from '@/lib/warna-tema';

/**
 * Mengekalkan meta theme-color selaras dengan tema aktif, supaya bar status
 * bertukar bersama halaman dan bukan kekal gelap dalam mod cerah.
 */
export default function WarnaTema() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const warna = resolvedTheme === 'light' ? WARNA_TEMA.cerah : WARNA_TEMA.gelap;

    // Ganti tag itu, bukan setAttribute('content', …) padanya. WebKit
    // mengambil semula theme-color apabila meta[name=theme-color] dimasukkan
    // atau dibuang, tetapi kerap mengabaikan mutasi kandungan di tempatnya —
    // itulah sebabnya iOS mengekalkan warna bar status lama sedangkan halaman
    // sudah dicat semula. Membuang setiap padanan juga meruntuhkan sebarang
    // pendua yang mungkin ditinggalkan Next.
    document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());

    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    meta.setAttribute('content', warna);
    document.head.appendChild(meta);
  }, [resolvedTheme]);

  return null;
}
