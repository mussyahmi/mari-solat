'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2Icon, MapPinIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QiblaCard from '@/components/QiblaCard';
import PageShell from '@/components/PageShell';
import { namaArah } from '@/lib/kiblat';

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
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [locLoading, setLocLoading] = useState(true);

  const [heading, setHeading] = useState<number | null>(null);
  const [motionGranted, setMotionGranted] = useState(false);
  const lastHeadingRef = useRef<number | null>(null);
  const alignedRef = useRef(false);

  // Location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocError('Geolokasi tidak disokong oleh pelayar anda.');
      setLocLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords: c }) => {
        setCoords({ lat: c.latitude, lng: c.longitude });
        setLocLoading(false);
      },
      () => {
        setLocError('Tidak dapat mengakses lokasi. Sila benarkan akses lokasi dan cuba semula.');
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
      if ('vibrate' in navigator) navigator.vibrate(40);
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
      tajuk="Arah Kiblat"
      lede="Pusingkan peranti anda sehingga jarum bertemu penanda Kaabah."
      aksi={
        needsPermissionButton ? (
          <Button size="sm" variant="outline" onClick={requestPermission}>
            Aktifkan kompas
          </Button>
        ) : undefined
      }
    >
      {locLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2Icon className="size-4 animate-spin" />
          <span>Mengesan lokasi anda…</span>
        </div>
      ) : locError ? (
        <div className="max-w-md">
          <p className="paparan text-2xl">Lokasi tidak dikesan</p>
          <p className="mt-2 leading-relaxed text-muted-foreground">{locError}</p>
          <button
            onClick={() => location.reload()}
            className="mt-4 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-naik transition-colors hover:bg-primary/90"
          >
            Cuba lagi
          </button>
        </div>
      ) : coords ? (
        <div className="flex flex-col gap-10">
          {/* Bearing ialah fakta halaman ini — ia mendapat layanan yang sama
              seperti kiraan detik di halaman utama. Kompas duduk di sebelahnya
              sebagai alat, bukan sebagai hero. */}
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
            <div className="flex min-w-0 flex-col items-start gap-2">
              <p className="paparan text-2xl leading-none lg:text-3xl">
                Kiblat
                {isAligned && (
                  <span className="ml-3 align-middle font-sans text-sm font-semibold text-primary">
                    anda menghadapnya
                  </span>
                )}
              </p>
              <p
                className={`angka-paparan text-[22vw] leading-none sm:text-[16vw] lg:text-[9vw] ${
                  isAligned ? 'text-primary' : ''
                }`}
              >
                {Math.round(qibla)}°
              </p>
              <p className="text-muted-foreground">{namaArah(qibla)} dari arah utara</p>
            </div>

            <div className="shrink-0 self-center">
              <QiblaCard qibla={qibla} heading={heading} isAligned={isAligned} />
            </div>
          </div>

          <dl className="flex flex-wrap gap-x-12 gap-y-4 border-t border-border/60 pt-5">
            <div>
              <dt className="text-sm text-muted-foreground">Arah anda</dt>
              <dd className={`angka-paparan mt-1 text-2xl ${isAligned ? 'text-primary' : ''}`}>
                {normalizedHeading !== null ? `${Math.round(normalizedHeading)}°` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Beza sudut</dt>
              <dd className={`angka-paparan mt-1 text-2xl ${isAligned ? 'text-primary' : ''}`}>
                {alignmentError !== null ? `${Math.round(alignmentError)}°` : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Kompas</dt>
              <dd className="mt-1 text-lg">
                {heading !== null ? 'Aktif' : motionGranted ? 'Tiada sensor' : 'Belum diaktifkan'}
              </dd>
            </div>
          </dl>

          <section className="max-w-[68ch]">
            <h2 className="paparan text-2xl">Cara arah ini dikira</h2>

            <p className="mt-4 leading-relaxed text-muted-foreground">
              Arah ini dikira sebagai laluan terpendek di atas permukaan bumi dari kedudukan anda ke
              Kaabah di Makkah (21.4225° U, 39.8262° T). Kerana bumi sfera, laluan terpendek itu
              bukan garis lurus di atas peta rata.
            </p>

            <h3 className="paparan mt-8 text-lg">Nombor boleh dipercayai, kompas bergantung telefon</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Bacaan {Math.round(qibla)}° dikira daripada koordinat anda dan tidak berubah melainkan
              anda berpindah tempat. Kompas yang berputar di atas pula bergantung pada sensor magnet
              telefon, dan sensor itu mudah terganggu.
            </p>

            <ul className="mt-4 space-y-3 text-muted-foreground">
              {[
                'Sarung telefon bermagnet, meja besi, kereta dan peralatan elektrik boleh menyimpangkan bacaan berpuluh darjah.',
                'Lambaikan telefon dalam bentuk angka lapan beberapa kali sebelum membaca — itu membetulkan semula bacaan sensor.',
                'Berdiri jauh sedikit daripada struktur besi, dan pegang telefon rata.',
              ].map(t => (
                <li key={t} className="flex gap-3">
                  <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-muted-foreground" />
                  <span className="leading-relaxed">{t}</span>
                </li>
              ))}
            </ul>

            <h3 className="paparan mt-8 text-lg">Jika ragu</h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Bandingkan dengan arah saf di masjid atau surau berdekatan — itu rujukan yang sudah
              disemak. Aplikasi ini membantu anda menganggar, bukan menggantikan pengesahan di
              tempat solat.
            </p>
          </section>
        </div>
      ) : null}
    </PageShell>
  );
}
