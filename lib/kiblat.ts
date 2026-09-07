/** Kaabah, Makkah. */
const KAABAH = { lat: 21.422487, lng: 39.826206 };

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * Bearing bulatan besar dari satu titik ke Kaabah, dalam darjah dari utara.
 *
 * Dipindahkan keluar daripada app/arah-kiblat supaya modul ringkas di halaman
 * utama boleh menunjukkan bearing tanpa menyalin pengiraan.
 */
export function bearingKiblat(lat: number, lng: number) {
  const f1 = rad(lat);
  const f2 = rad(KAABAH.lat);
  const dl = rad(KAABAH.lng - lng);
  const y = Math.sin(dl);
  const x = Math.cos(f1) * Math.tan(f2) - Math.sin(f1) * Math.cos(dl);
  return (deg(Math.atan2(y, x)) + 360) % 360;
}

const MATA_ANGIN = ['Utara', 'Timur laut', 'Timur', 'Tenggara', 'Selatan', 'Barat daya', 'Barat', 'Barat laut'];

export function namaArah(bearing: number) {
  return MATA_ANGIN[Math.round(bearing / 45) % 8];
}
