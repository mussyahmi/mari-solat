import type { Kamus } from '@/lib/bahasa';

/**
 * Log perubahan MariSolat, bermula dari versi 2.0. Terbaru di atas.
 *
 * Aliran kerja: setiap kali versi dinaikkan, tambah satu entri di sini
 * (versi sama seperti package.json) sebelum commit dan deploy.
 */
export type Entri = {
  versi: string;
  /** YYYY-MM-DD */
  tarikh: string;
  /** Tajuk ringkas pelancaran, jika ada. */
  tajuk?: Kamus<string>;
  perubahan: Kamus<string[]>;
};

export const CHANGELOG: Entri[] = [
  {
    versi: '2.3.0',
    tarikh: '2026-11-06',
    perubahan: {
      ms: [
        'Halaman utama: kad "Status hari ini" yang ringkas untuk solat, zikir dan Al-Quran — kemas kini dibuat di Jejak Ibadah',
        'Selepas Isyak, halaman utama kekal pada Hari ini dan mengira detik ke Subuh esok',
        'Hanya Al-Quran membawa baki ke hari berikutnya; amalan lain dinilai hari demi hari',
        'Halaman "Apa yang baru" — log perubahan setiap versi',
      ],
      en: [
        'Home: a simple "Today\'s status" card for solat, zikir and Quran — updates are made in the Ibadah Tracker',
        'After Isyak, the home page stays on Today and counts down to tomorrow\'s Subuh',
        'Only the Quran carries a backlog forward; other practices are judged day by day',
        'New "What\'s new" page — a changelog for every version',
      ],
    },
  },
  {
    versi: '2.2.0',
    tarikh: '2026-11-06',
    perubahan: {
      ms: [
        'Jejak Ibadah: jalur 30 hari dengan titik status — tekan mana-mana hari untuk mengemas kini rekod yang terlupa',
        'Leret ke kiri atau kanan untuk bertukar hari dalam Jejak Ibadah',
        'Kad solat lebih padat',
      ],
      en: [
        'Ibadah Tracker: a 30-day strip with status dots — tap any day to update a forgotten record',
        'Swipe left or right to switch days in the Ibadah Tracker',
        'More compact prayer cards',
      ],
    },
  },
  {
    versi: '2.1.2',
    tarikh: '2026-10-31',
    perubahan: {
      ms: ['Pratonton pautan baharu apabila MariSolat dikongsi di media sosial'],
      en: ['New link preview when MariSolat is shared on social media'],
    },
  },
  {
    versi: '2.1.1',
    tarikh: '2026-10-31',
    perubahan: {
      ms: [
        'Kiraan detik kini menunjukkan saat',
        'Nama amalan dipaparkan penuh pada skrin kecil',
        'Ikon sematan pada Solat dan Zikir dalam senarai amalan',
      ],
      en: [
        'The countdown now shows seconds',
        'Practice names show in full on small screens',
        'Pin icon on Solat and Zikir in the practice list',
      ],
    },
  },
  {
    versi: '2.1.0',
    tarikh: '2026-10-31',
    perubahan: {
      ms: [
        'Pilihan saiz teks: Kecil, Sederhana atau Normal (Tetapan → Rupa)',
        'Logo kekal dalam warna biru lembut apa jua warna tema',
      ],
      en: [
        'Text size option: Small, Medium or Normal (Settings → Appearance)',
        'The logo stays soft blue whatever theme colour is chosen',
      ],
    },
  },
  {
    versi: '2.0.1',
    tarikh: '2026-10-31',
    perubahan: {
      ms: [
        'Getaran dibuang dari seluruh aplikasi',
        'Warna grid Ringkasan seragam untuk semua amalan',
        'Semalam dan Esok kini hanya memaparkan waktu solat',
        'Zikir lalai ialah 4 zikir asas selepas solat',
      ],
      en: [
        'Vibration removed across the app',
        'Overview grid colours are now the same for every practice',
        'Yesterday and Tomorrow now show prayer times only',
        'The default zikir list is the 4 basic zikir after solat',
      ],
    },
  },
  {
    versi: '2.0.0',
    tarikh: '2026-10-31',
    tajuk: { ms: 'MariSolat 2.0', en: 'MariSolat 2.0' },
    perubahan: {
      ms: [
        'Kad langit: kiraan detik ke waktu seterusnya dengan laluan matahari',
        'Jejak Ibadah: tanda solat 5 waktu, zikir selepas solat dan bacaan Al-Quran setiap hari, dengan Ringkasan pencapaian',
        'Al-Quran: baki dibawa ke hari berikutnya dan tanda bacaan terakhir',
        'Tambah amalan sendiri — sedekah, puasa sunat dan lain-lain',
        'Nafas Istighfar: bernafas perlahan sambil beristighfar, 30 saat atau 1 minit',
        'Peringatan harian: ayat Al-Quran dan hadis sahih mengikut topik, boleh dikongsi',
        'Pilihan warna tema, Bahasa Melayu dan English',
        'Logo mihrab baharu',
      ],
      en: [
        'Sky card: countdown to the next prayer with the path of the sun',
        'Ibadah Tracker: tick the five prayers, zikir after solat and Quran reading every day, with an Overview of your progress',
        'Quran: missed pages carry forward, plus a last-read bookmark',
        'Add your own practices — sedekah, sunnah fasts and more',
        'Istighfar Breathing: slow breathing with istighfar, 30 seconds or 1 minute',
        'Daily reminders: Quran verses and authentic hadith by topic, shareable',
        'Theme colour choice, Malay and English',
        'New mihrab logo',
      ],
    },
  },
];
