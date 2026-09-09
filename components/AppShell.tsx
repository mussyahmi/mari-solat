'use client';

import { useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import Header from '@/components/Header';
import AkaunProvider from '@/components/AkaunProvider';
import { bacaCacheWaktu, fasaPada, type Fasa } from '@/lib/solat';
import { trackVisitSenyap } from '@/lib/track';

/**
 * Rangka aplikasi.
 *
 * Sebelum ini setiap satu daripada 12 halaman mengimport bar sisinya sendiri.
 * Kini hanya ada satu kepala, dan kandungan memiliki selebihnya skrin.
 */
export default function AppShell({ children }: { children: React.ReactNode }) {
  // Basuhan dipacu oleh waktu solat sebenar, tetapi hanya halaman utama yang
  // mengambilnya — jadi ia dibaca daripada cache. Tiada cache bermakna fasa
  // lalai, bukan halaman tanpa latar.
  const [fasa, setFasa] = useState<Fasa>('siang');
  useEffect(() => {
    const kemas = () => {
      const waktu = bacaCacheWaktu();
      if (waktu) setFasa(fasaPada(waktu, new Date()).fasa);
    };
    kemas();
    const jam = setInterval(kemas, 60_000);
    return () => clearInterval(jam);
  }, []);

  // Jejak dari sini dan bukan dari halaman utama: rangka ini membalut setiap
  // laluan, jadi orang yang mendarat terus pada qada, tasbih atau halaman ilmu
  // akhirnya dikira juga.
  useEffect(() => {
    trackVisitSenyap();
  }, []);

  return (
    // Blok CSS prefers-reduced-motion hanya menghentikan animasi CSS; spring
    // motion dipacu JavaScript dan perlu diberitahu secara berasingan.
    <MotionConfig reducedMotion="user">
      <AkaunProvider>
      <div className="flex h-dvh flex-col">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-screen transition-colors duration-1000"
          style={{
            backgroundImage: `radial-gradient(ellipse 130% 95% at 50% -10%, color-mix(in oklab, var(--fasa-${fasa}) var(--kuat-basuh), transparent) 0%, transparent 78%)`,
          }}
        />
        <Header />
        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto focus-visible:outline-none" tabIndex={0}>
          {children}
        </div>
      </div>
      </AkaunProvider>
    </MotionConfig>
  );
}
