import { teksSemasa } from '@/lib/bahasa';

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
const ms = {
  tidakDisokong: (susulan?: string) =>
    `Pelayar ini tidak menyokong geolokasi.${susulan ? ` ${susulan}` : ''}`,
  tidakDibaca: (susulan?: string) =>
    `Lokasi anda tidak dapat dibaca.${susulan ? ` ${susulan}` : ''}`,
  tiadaZon: 'Tiada zon waktu solat ditemui untuk lokasi ini.',
  pilihZon: 'Pilih zon anda di Tetapan.',
};
const en: typeof ms = {
  tidakDisokong: susulan =>
    `This browser doesn't support geolocation.${susulan ? ` ${susulan}` : ''}`,
  tidakDibaca: susulan =>
    `Your location couldn't be read.${susulan ? ` ${susulan}` : ''}`,
  tiadaZon: 'No prayer time zone was found for this location.',
  pilihZon: 'Choose your zone in Settings.',
};
export const TEKS_LOKASI = { ms, en };

export const RALAT_LOKASI = {
  tidakDisokong: (susulan?: string) => teksSemasa(TEKS_LOKASI).tidakDisokong(susulan),
  tidakDibaca: (susulan?: string) => teksSemasa(TEKS_LOKASI).tidakDibaca(susulan),
  get tiadaZon() { return teksSemasa(TEKS_LOKASI).tiadaZon; },
};

/**
 * Susulan yang paling kerap: pilih zon secara manual. Malar BM sahaja;
 * gunakan `susulanPilihZon()` untuk teks mengikut bahasa semasa.
 */
export const PILIH_ZON = ms.pilihZon;
export const susulanPilihZon = () => teksSemasa(TEKS_LOKASI).pilihZon;
