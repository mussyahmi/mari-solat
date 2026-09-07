'use client';

import { useRef } from 'react';
import { ExternalLinkIcon } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Membuka carian masjid berdekatan dalam Google Maps.
 * Kedudukan disimpan supaya klik kedua tidak meminta lokasi sekali lagi.
 */
export default function CariMasjid() {
  const kedudukan = useRef<{ lat: number; lng: number } | null>(null);

  const buka = (lat: number, lng: number) =>
    window.open(`https://www.google.com/maps/search/masjid/@${lat},${lng},15z`, '_blank');

  const kendali = () => {
    if (kedudukan.current) {
      buka(kedudukan.current.lat, kedudukan.current.lng);
      return;
    }
    if (!navigator.geolocation) {
      toast.error('Pelayar ini tidak menyokong geolokasi.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        kedudukan.current = { lat: coords.latitude, lng: coords.longitude };
        buka(coords.latitude, coords.longitude);
      },
      // Sebelum ini kegagalan lokasi senyap sepenuhnya — butang diketik dan
      // tiada apa-apa berlaku.
      () => toast.error('Lokasi tidak dapat dibaca, jadi masjid berdekatan tidak dapat dicari.'),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={kendali}
      className="flex items-center gap-1.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      Cari masjid berdekatan
      <ExternalLinkIcon className="size-3.5" />
    </button>
  );
}
