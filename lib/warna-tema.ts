/**
 * Warna bar status dan kroma pelayar, sepadan dengan --background dalam
 * globals.css bagi setiap tema.
 *
 * Ia duduk dalam lib dan bukan di sebelah komponen penyelaras kerana tiga
 * tempat memerlukannya merentas sempadan pelayan/klien: eksport `viewport`
 * dalam susun atur akar (modul pelayan), skrip sebaris sebelum cat pertama,
 * dan komponen klien yang menyelaraskannya selepas itu. Mengimportnya dari
 * modul "use client" menyebabkan Next menggugurkan meta theme-color daripada
 * output SSR sepenuhnya.
 *
 * Nilai diambil daripada warna latar sebenar yang dikira pelayar, bukan
 * dianggar dengan tangan — nilai lama #0b1310 tidak sepadan dengan mana-mana
 * tema.
 */
export const WARNA_TEMA = {
  cerah: '#f8fcf9',
  gelap: '#02100a',
};
