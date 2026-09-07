'use client';

import { motion } from 'motion/react';
import { berperingkat, naikMasuk } from '@/lib/motion';

/**
 * Rangka halaman kanonik.
 *
 * Sebelum ini lapan halaman menggunakan `min-h-screen lg:flex` dan tiga lagi
 * menggunakan `h-full flex … overflow-hidden`, masing-masing dengan pembalut
 * lebar yang berbeza. Semua halaman dalaman kini menggunakan rangka ini.
 */
export default function PageShell({
  tajuk,
  lede,
  aksi,
  children,
}: {
  tajuk: string;
  lede?: string;
  /** Kawalan pilihan yang duduk sebaris dengan tajuk. */
  aksi?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <motion.main
      variants={berperingkat()}
      initial="sembunyi"
      animate="tunjuk"
      className="mx-auto w-full max-w-7xl px-5 pb-16 pt-4 lg:px-10"
    >
      <motion.header variants={naikMasuk} className="mb-12 flex items-start justify-between gap-6">
        <div>
          <h1 className="paparan text-4xl lg:text-5xl">{tajuk}</h1>
          {lede && <p className="mt-3 max-w-[62ch] text-pretty text-lg leading-relaxed text-muted-foreground">{lede}</p>}
        </div>
        {aksi}
      </motion.header>

      <motion.div variants={naikMasuk}>{children}</motion.div>
    </motion.main>
  );
}
