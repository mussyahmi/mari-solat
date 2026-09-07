'use client';

import { motion, useReducedMotion } from 'motion/react';
import { lengkung, tempoh } from '@/lib/motion';

/**
 * Senarai yang terbuka semasa ditatal.
 *
 * Halaman ilmu ialah bahan bacaan — orang mendarat di sini untuk belajar dan
 * akan menatal walau apa pun. Itu tempat gerakan berbaloi, berbeza dengan
 * papan pemuka yang mesti menjawab serta-merta tanpa perlu ditatal.
 *
 * Bukan sekadar naik-dan-lut: setiap item terbuka dari tepi kiri seperti
 * sesuatu yang sedang dibaca baris demi baris.
 */
export function SenaraiSkrol({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}

export function ItemSkrol({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  // reducedMotion="user" hanya meredam transformasi, bukan pudar kelegapan —
  // jadi pengguna yang memilih keluar daripada gerakan masih mendapat
  // kandungan yang tersembunyi sehingga ditatal. Di sini kandungan sentiasa
  // kelihatan; hanya pendedahan yang digugurkan.
  const kurangGerak = useReducedMotion();

  return (
    <motion.li
      className={className}
      // Menggugurkan prop animasi tidak membatalkan gaya sebaris yang sudah
      // ditulis oleh motion, jadi item boleh tersangkut pada kelegapan 0.
      // Sebaliknya sasaran sentiasa kekal; hanya keadaan awal yang berubah.
      initial={kurangGerak ? { opacity: 1, x: 0 } : { opacity: 0, x: -14 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.45, margin: '0px 0px -12% 0px' }}
      transition={kurangGerak ? { duration: 0 } : { duration: tempoh.perlahan, ease: lengkung.keluar }}
    >
      {children}
    </motion.li>
  );
}
