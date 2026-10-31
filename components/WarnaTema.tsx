'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { PERISTIWA_AKSEN } from '@/lib/aksen';

/** Warna latar sebenar sebagai hex — meta theme-color tidak boleh dipercayai
    menerima oklch pada semua pelayar. */
function latarHex() {
  const kanvas = document.createElement('canvas');
  kanvas.width = kanvas.height = 1;
  const ctx = kanvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = getComputedStyle(document.body).backgroundColor;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Mengekalkan meta theme-color selaras dengan tema aktif, supaya bar status
 * bertukar bersama halaman dan bukan kekal gelap dalam mod cerah. Latar kini
 * diwarnakan mengikut warna tema pilihan, jadi nilainya dibaca daripada
 * halaman dan bukan dari jadual tetap.
 */
export default function WarnaTema() {
  const { resolvedTheme } = useTheme();
  const [aksen, setAksen] = useState(0);

  useEffect(() => {
    const kemas = () => setAksen(n => n + 1);
    window.addEventListener(PERISTIWA_AKSEN, kemas);
    return () => window.removeEventListener(PERISTIWA_AKSEN, kemas);
  }, []);

  useEffect(() => {
    const warna = latarHex();
    if (!warna) return;

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
  }, [resolvedTheme, aksen]);

  return null;
}
