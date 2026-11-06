'use client';

import { useState, useEffect, useRef } from 'react';
import { Compass, Globe2, Infinity as Lapan, Landmark, Loader2Icon, Magnet, Smartphone, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QiblaCard from '@/components/QiblaCard';
import PageShell from '@/components/PageShell';
import { useBahasa, useTeks } from '@/components/BahasaProvider';
import { namaArah } from '@/lib/kiblat';
import { palet } from '@/lib/aksen';
import { cn } from '@/lib/utils';

type RalatLokasi = 'tiadaSokongan' | 'ditolak';

const ms = {
  tajuk: 'Arah Kiblat',
  lede: 'Pusingkan peranti anda sehingga jarum bertemu penanda Kaabah.',
  aktifkanKompas: 'Aktifkan kompas',
  mengesan: 'Mengesan lokasi anda…',
  tiadaSokongan: 'Geolokasi tidak disokong oleh pelayar anda.',
  ditolak: 'Tidak dapat mengakses lokasi. Sila benarkan akses lokasi dan cuba semula.',
  tidakDikesan: 'Lokasi tidak dikesan',
  cubaLagi: 'Cuba lagi',
  kiblat: 'Kiblat',
  menghadap: 'anda menghadapnya',
  dariUtara: (arah: string) => `${arah} dari arah utara`,
  arahAnda: 'Arah anda',
  bezaSudut: 'Beza sudut',
  kompas: 'Kompas',
  aktif: 'Aktif',
  tiadaSensor: 'Tiada sensor',
  belumAktif: 'Belum diaktifkan',
  caraDikira: 'Cara arah ini dikira',
  penerangan: 'Arah ini dikira sebagai laluan terpendek di atas permukaan bumi dari kedudukan anda ke Kaabah di Makkah (21.4225° U, 39.8262° T). Kerana bumi sfera, laluan terpendek itu bukan garis lurus di atas peta rata.',
  nomborTajuk: 'Nombor boleh dipercayai, kompas bergantung telefon',
  nomborTeks: (darjah: number) =>
    `Bacaan ${darjah}° dikira daripada koordinat anda dan tidak berubah melainkan anda berpindah tempat. Kompas yang berputar di atas pula bergantung pada sensor magnet telefon, dan sensor itu mudah terganggu.`,
  petua: [
    'Sarung telefon bermagnet, meja besi, kereta dan peralatan elektrik boleh menyimpangkan bacaan berpuluh darjah.',
    'Lambaikan telefon dalam bentuk angka lapan beberapa kali sebelum membaca. Ini membetulkan semula bacaan sensor.',
    'Berdiri jauh sedikit daripada struktur besi, dan pegang telefon rata.',
  ],
  ragu: 'Jika ragu',
  raguTeks: 'Bandingkan dengan arah saf di masjid atau surau berdekatan. Itu rujukan yang sudah disemak. Aplikasi ini membantu anda menganggar, bukan menggantikan pengesahan di tempat solat.',
};
const en: typeof ms = {
  tajuk: 'Qibla Direction',
  lede: 'Turn your device until the needle meets the Kaabah marker.',
  aktifkanKompas: 'Enable compass',
  mengesan: 'Finding your location…',
  tiadaSokongan: "Your browser doesn't support geolocation.",
  ditolak: "Couldn't access your location. Please allow location access and try again.",
  tidakDikesan: 'Location not found',
  cubaLagi: 'Try again',
  kiblat: 'Qibla',
  menghadap: "you're facing it",
  dariUtara: arah => `${arah} from north`,
  arahAnda: 'Your heading',
  bezaSudut: 'Angle off',
  kompas: 'Compass',
  aktif: 'Active',
  tiadaSensor: 'No sensor',
  belumAktif: 'Not enabled yet',
  caraDikira: 'How this direction is calculated',
  penerangan: 'The direction is the shortest path over the surface of the earth from where you are to the Kaabah in Makkah (21.4225° N, 39.8262° E). Because the earth is a sphere, that shortest path is not a straight line on a flat map.',
  nomborTajuk: 'Trust the number; the compass depends on your phone',
  nomborTeks: darjah =>
    `The ${darjah}° reading is calculated from your coordinates and stays the same unless you move. The spinning compass above relies on your phone's magnetic sensor, which is easily disturbed.`,
  petua: [
    'Magnetic phone cases, metal tables, cars and electrical appliances can throw the reading off by tens of degrees.',
    'Wave your phone in a figure-eight a few times before reading. That recalibrates the sensor.',
    'Stand a little away from metal structures, and hold your phone flat.',
  ],
  ragu: 'If in doubt',
  raguTeks: 'Compare with the saf direction at a nearby masjid or surau. That is a checked reference. This app helps you estimate; it does not replace confirming at a place of prayer.',
};
const TEKS = { ms, en };

// Ikon dan warna bagi setiap petua, mengikut susunan dalam `petua`.
const CIP_PETUA: { ikon: LucideIcon; w: number }[] = [
  { ikon: Magnet, w: 3 },
  { ikon: Lapan, w: 0 },
  { ikon: Smartphone, w: 1 },
];

function getQiblaBearing(lat: number, lng: number) {
  const kLat = 21.422487, kLng = 39.826206;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;
  const φ1 = toRad(lat), φ2 = toRad(kLat);
  const Δλ = toRad(kLng - lng);
  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export default function ArahKiblatPage() {
  const t = useTeks(TEKS);
  const { bahasa } = useBahasa();
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<RalatLokasi | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  const [heading, setHeading] = useState<number | null>(null);
  const [motionGranted, setMotionGranted] = useState(false);
  const lastHeadingRef = useRef<number | null>(null);
  const alignedRef = useRef(false);

  // Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('tiadaSokongan');
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocLoading(false);
      },
      () => {
        setLocError('ditolak');
        setLocLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // Compass heading
  useEffect(() => {
    if (!motionGranted) return;
    const handler = (e: DeviceOrientationEvent) => {
      const ev = e as any;
      let h: number | null = null;
      if (ev.webkitCompassHeading !== undefined) {
        h = ev.webkitCompassHeading; // iOS: clockwise from north, correct
      } else if (e.alpha !== null) {
        h = (360 - e.alpha) % 360; // Android: alpha is CCW, invert to CW
      }
      if (h === null) return;
      h = ((h % 360) + 360) % 360;
      if (lastHeadingRef.current !== null) {
        const diff = h - lastHeadingRef.current;
        if (diff > 180) h -= 360;
        else if (diff < -180) h += 360;
      }
      lastHeadingRef.current = h;
      setHeading(h);
    };
    // Use deviceorientationabsolute on Android (gives north-referenced alpha)
    // Fall back to deviceorientation for iOS (uses webkitCompassHeading)
    const eventName = ('ondeviceorientationabsolute' in window)
      ? 'deviceorientationabsolute'
      : 'deviceorientation';
    window.addEventListener(eventName, handler, true);
    return () => window.removeEventListener(eventName, handler, true);
  }, [motionGranted]);

  // Auto-grant for non-iOS
  useEffect(() => {
    if (
      typeof DeviceOrientationEvent === 'undefined' ||
      typeof (DeviceOrientationEvent as any).requestPermission !== 'function'
    ) {
      setMotionGranted(true);
    }
  }, []);

  // Update motionGranted when heading arrives
  useEffect(() => {
    if (heading !== null) setMotionGranted(true);
  }, [heading]);

  const requestPermission = () => {
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      (DeviceOrientationEvent as any).requestPermission()
        .then((res: string) => { if (res === 'granted') setMotionGranted(true); })
        .catch(() => {});
    } else {
      setMotionGranted(true);
    }
  };

  const qibla = coords ? getQiblaBearing(coords.lat, coords.lng) : 0;
  const normalizedHeading = heading !== null ? ((heading % 360) + 360) % 360 : null;
  const rotation = heading !== null ? (qibla - heading + 360) % 360 : qibla;
  const alignmentError = heading !== null ? Math.min(Math.abs(rotation), Math.abs(rotation - 360)) : null;
  const isAligned = alignmentError !== null && alignmentError <= 5;

  // Haptic
  useEffect(() => {
    if (isAligned && !alignedRef.current) {
      alignedRef.current = true;
    }
    if (!isAligned) alignedRef.current = false;
  }, [isAligned]);

  // DeviceOrientationEvent tidak wujud di pelayan, jadi membacanya semasa
  // render pertama menyebabkan HTML pelayan dan klien tidak sepadan.
  const [dipasang, setDipasang] = useState(false);
  useEffect(() => setDipasang(true), []);

  const needsPermissionButton =
    dipasang &&
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as { requestPermission?: unknown }).requestPermission === 'function' &&
    !motionGranted;

  return (
    <PageShell
      tajuk={t.tajuk}
      lede={t.lede}
      aksi={
        needsPermissionButton ? (
          <Button size="sm" variant="outline" className="rounded-full" onClick={requestPermission}>
            {t.aktifkanKompas}
          </Button>
        ) : undefined
      }
    >
      {locLoading ? (
        <div className="kad flex items-center gap-2 p-5 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>{t.mengesan}</span>
        </div>
      ) : locError ? (
        <div className="kad max-w-md p-6">
          <p className="paparan text-2xl">{t.tidakDikesan}</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">{t[locError]}</p>
          <button
            onClick={() => location.reload()}
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
          >
            {t.cubaLagi}
          </button>
        </div>
      ) : coords ? (
        <div className="flex flex-col gap-5">
          {/* Bearing ialah fakta halaman ini — ia mendapat layanan yang sama
              seperti kiraan detik di halaman utama. Kompas duduk di sebelahnya
              sebagai alat, bukan sebagai hero. */}
          <div
            className={cn(
              'kad flex flex-col gap-6 p-5 transition-colors sm:p-7 lg:flex-row lg:items-center lg:justify-between lg:gap-16',
              isAligned && 'bg-accent'
            )}
          >
            <div className="flex min-w-0 flex-col items-start gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-w3-lembut text-w3">
                  <Compass className="size-5" strokeWidth={2} />
                </span>
                <p className="paparan text-2xl leading-none lg:text-3xl">{t.kiblat}</p>
                {isAligned && (
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                    {t.menghadap}
                  </span>
                )}
              </div>
              <p
                className={`angka-paparan text-[22vw] leading-none sm:text-[16vw] lg:text-[9vw] ${
                  isAligned ? 'text-primary' : 'text-w3'
                }`}
              >
                {Math.round(qibla)}°
              </p>
              <p className="text-muted-foreground">{t.dariUtara(namaArah(qibla, bahasa))}</p>
            </div>

            <div className="shrink-0 self-center">
              <QiblaCard qibla={qibla} heading={heading} isAligned={isAligned} />
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-2.5 sm:gap-3">
            {(
              [
                [t.arahAnda, normalizedHeading !== null ? `${Math.round(normalizedHeading)}°` : '-', 5, true],
                [t.bezaSudut, alignmentError !== null ? `${Math.round(alignmentError)}°` : '-', 4, true],
                [t.kompas, heading !== null ? t.aktif : motionGranted ? t.tiadaSensor : t.belumAktif, 1, false],
              ] as const
            ).map(([label, nilai, w, angka]) => (
              <div key={label} className={cn('rounded-3xl p-4 sm:p-5', palet(w).lembut)}>
                <dd
                  className={cn(
                    angka ? 'angka-paparan text-2xl sm:text-3xl' : 'text-base font-semibold sm:text-lg',
                    'leading-tight',
                    isAligned && angka ? 'text-primary' : palet(w).teks
                  )}
                >
                  {nilai}
                </dd>
                <dt className="mt-2 text-xs leading-snug text-foreground/70 sm:text-sm">{label}</dt>
              </div>
            ))}
          </dl>

          <section className="kad max-w-3xl p-5 sm:p-6">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-w6-lembut text-w6">
              <Globe2 className="size-5" strokeWidth={2} />
            </span>
            <h2 className="paparan mt-4 text-2xl">{t.caraDikira}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {t.penerangan}
            </p>
          </section>

          <section className="kad max-w-3xl p-5 sm:p-6">
            <h3 className="paparan text-lg">{t.nomborTajuk}</h3>
            <p className="mt-2 leading-relaxed text-muted-foreground">
              {t.nomborTeks(Math.round(qibla))}
            </p>

            {/* Setiap petua mendapat cip ikon dan warnanya sendiri. */}
            <ul className="mt-3 divide-y divide-border/50">
              {t.petua.map((p, i) => {
                const { ikon: Ikon, w } = CIP_PETUA[i % CIP_PETUA.length];
                return (
                  <li key={p} className="flex gap-4 py-4 last:pb-0">
                    <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', palet(w).lembut, palet(w).teks)}>
                      <Ikon className="size-5" strokeWidth={2} />
                    </span>
                    <span className="min-w-0 self-center leading-relaxed text-muted-foreground">{p}</span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="flex max-w-3xl gap-4 rounded-3xl bg-amaran-lembut p-5 sm:p-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-card text-amaran">
              <Landmark className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0">
              <h3 className="paparan text-lg">{t.ragu}</h3>
              <p className="mt-1 leading-relaxed text-foreground/75">
                {t.raguTeks}
              </p>
            </div>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
