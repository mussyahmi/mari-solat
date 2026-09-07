import type { Transition, Variants } from 'motion/react';

/**
 * Token gerakan dikongsi.
 *
 * Gerakan yang tidak dicetuskan pengguna digunakan berhemat: satu urutan
 * ketika halaman dimuatkan, dan selebihnya hanya bertindak balas kepada
 * tindakan pengguna supaya jelas apa yang berubah.
 */

export const tempoh = {
  pantas: 0.15,
  sederhana: 0.28,
  perlahan: 0.5,
  bernafas: 0.9,
} as const;

/** Keluk penyahlajuan — cepat bermula, berhenti dengan lembut. */
export const lengkung = {
  keluar: [0.16, 1, 0.3, 1],
  masukKeluar: [0.65, 0, 0.35, 1],
  masuk: [0.5, 0, 0.75, 0],
} as const;

export const spring = {
  /** Digit kiraan detik: ketat, tiada lantunan yang mengganggu bacaan. */
  digit: { type: 'spring', stiffness: 520, damping: 34, mass: 0.7 },
  /** Jarum kompas: teredam supaya bacaan kompas yang bising tidak menggigil. */
  jarum: { type: 'spring', stiffness: 90, damping: 18, mass: 1.1 },
  /** Maklum balas ketikan — tasbih, butang bulat. */
  ketik: { type: 'spring', stiffness: 700, damping: 26, mass: 0.5 },
  /** Peralihan susun atur am. */
  susunAtur: { type: 'spring', stiffness: 260, damping: 30 },
} satisfies Record<string, Transition>;

/** Satu urutan muat halaman: kandungan naik sedikit dan menjelma. */
export const naikMasuk: Variants = {
  sembunyi: { opacity: 0, y: 12 },
  tunjuk: {
    opacity: 1,
    y: 0,
    transition: { duration: tempoh.perlahan, ease: lengkung.keluar },
  },
};

/** Bekas untuk urutan berperingkat. Guna sekali sahaja setiap halaman. */
export const berperingkat = (jeda = 0.06): Variants => ({
  sembunyi: {},
  tunjuk: { transition: { staggerChildren: jeda } },
});

/** Menjelma tanpa gerakan — untuk tukar kandungan di tempat yang sama. */
export const jelma: Variants = {
  sembunyi: { opacity: 0 },
  tunjuk: { opacity: 1, transition: { duration: tempoh.sederhana } },
  keluar: { opacity: 0, transition: { duration: tempoh.pantas } },
};
