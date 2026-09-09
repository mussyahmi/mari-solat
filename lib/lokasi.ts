/**
 * Mesej ralat lokasi yang dikongsi.
 *
 * Tiga tempat meminta lokasi — halaman utama, Tetapan dan "Cari masjid
 * berdekatan" — dan setiap satu menulis ayatnya sendiri. Keadaan yang sama
 * terpapar sebagai tiga mesej berbeza bergantung pada halaman mana yang
 * memintanya.
 *
 * `susulan` ialah apa yang pengguna boleh buat seterusnya, dan ia berbeza
 * mengikut tempat, jadi ia diberi sebagai hujah dan bukan dibakar ke dalam
 * ayat.
 */
export const RALAT_LOKASI = {
  tidakDisokong: (susulan?: string) =>
    `Pelayar ini tidak menyokong geolokasi.${susulan ? ` ${susulan}` : ''}`,
  tidakDibaca: (susulan?: string) =>
    `Lokasi anda tidak dapat dibaca.${susulan ? ` ${susulan}` : ''}`,
  tiadaZon: 'Tiada zon waktu solat ditemui untuk lokasi ini.',
} as const;

/** Susulan yang paling kerap: pilih zon secara manual. */
export const PILIH_ZON = 'Pilih zon anda di Tetapan.';
