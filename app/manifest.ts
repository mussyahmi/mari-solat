import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MariSolat',
    short_name: 'MariSolat',
    description: 'Waktu Solat Malaysia',
    start_url: '/',
    display: 'standalone',
    // Sepadan dengan --background dan --primary dalam globals.css.
    background_color: '#0b1310',
    theme_color: '#0b1310',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      // Ikon maskable perlu safe-zone (logo dalam 60% tengah) — pelancar
      // Xiaomi/MIUI potong tepi ikon mengikut bentuk sistem.
      {
        src: '/icon-maskable-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
