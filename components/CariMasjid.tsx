'use client';

import { useRef } from 'react';
import { ExternalLinkIcon, MapPinnedIcon } from 'lucide-react';
import { toast } from 'sonner';
import { RALAT_LOKASI } from '@/lib/lokasi';
import { useTeks } from '@/components/BahasaProvider';

const ms = {
  cari: 'Cari masjid berdekatan',
  tidakDapatDicari: 'Masjid berdekatan tidak dapat dicari.',
};
const en: typeof ms = {
  cari: 'Find nearby mosques',
  tidakDapatDicari: "Couldn't search for nearby mosques.",
};
const TEKS = { ms, en };

/**
 * Membuka carian masjid berdekatan dalam Google Maps.
 * Kedudukan disimpan supaya klik kedua tidak meminta lokasi sekali lagi.
 */
export default function CariMasjid() {
  const kedudukan = useRef<{ lat: number; lng: number } | null>(null);
  const t = useTeks(TEKS);

  const buka = (lat: number, lng: number) =>
    window.open(`https://www.google.com/maps/search/masjid/@${lat},${lng},15z`, '_blank');

  const kendali = () => {
    if (kedudukan.current) {
      buka(kedudukan.current.lat, kedudukan.current.lng);
      return;
    }
    if (!navigator.geolocation) {
      toast.error(RALAT_LOKASI.tidakDisokong());
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        kedudukan.current = { lat: coords.latitude, lng: coords.longitude };
        buka(coords.latitude, coords.longitude);
      },
      // Sebelum ini kegagalan lokasi senyap sepenuhnya — butang diketik dan
      // tiada apa-apa berlaku.
      () => toast.error(RALAT_LOKASI.tidakDibaca(t.tidakDapatDicari)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <button
      onClick={kendali}
      className="flex items-center gap-2.5 rounded-2xl text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="flex size-7 shrink-0 items-center justify-center rounded-xl bg-w2-lembut text-w2">
        <MapPinnedIcon className="size-3.5" />
      </span>
      {t.cari}
      <ExternalLinkIcon className="size-3.5" />
    </button>
  );
}
