'use client';

import { useState, useEffect, useRef } from 'react';
import { Loader2Icon, MapPinIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import QiblaCard from '@/components/QiblaCard';
import Sidebar from '@/components/Sidebar';

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
    window.addEventListener('deviceorientation', handler, true);
    return () => window.removeEventListener('deviceorientation', handler, true);
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

  const needsPermissionButton =
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof (DeviceOrientationEvent as any).requestPermission === 'function' &&
    !motionGranted;

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">
      <Sidebar />

      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between px-4 lg:px-10 py-3 border-b border-border/40 shrink-0 gap-3">
          <div>
            <h1 className="text-sm font-semibold">Arah Kiblat</h1>
            <p className="text-xs text-muted-foreground/50">Kompas berorientasikan Kaabah</p>
          </div>
          {needsPermissionButton && (
            <Button size="sm" variant="outline" onClick={requestPermission}>
              Aktifkan Kompas
            </Button>
          )}
        </div>

        {/* Hero — compass */}
        <div className="flex-1 flex items-center justify-center px-4 py-10">
          {locLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2Icon className="animate-spin size-4" />
              <span>Mengesan lokasi...</span>
            </div>
          ) : locError ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-xs">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <MapPinIcon className="size-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Lokasi tidak dikesan</p>
                <p className="text-xs text-muted-foreground mt-1">{locError}</p>
              </div>
            </div>
          ) : coords ? (
            <div className="flex flex-col items-center gap-6">
              <QiblaCard qibla={qibla} heading={heading} isAligned={isAligned} />
              {isAligned && (
                <p className="text-sm font-medium text-emerald-500 tabular-nums">
                  Menghadap Kiblat
                </p>
              )}
              {heading === null && motionGranted && (
                <p className="text-xs text-muted-foreground/50">
                  Sensor kompas tidak tersedia pada peranti ini.
                </p>
              )}
            </div>
          ) : null}
        </div>

        {/* Bottom strip */}
        {coords && (
          <div className="border-t border-border/40 grid grid-cols-2 divide-x divide-border/40 shrink-0">
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground/40 mb-1">Kiblat</p>
              <p className="text-2xl font-bold tabular-nums">{Math.round(qibla)}°</p>
              <p className="text-xs text-muted-foreground/40 mt-0.5">dari arah Utara</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-xs text-muted-foreground/40 mb-1">Arah semasa</p>
              {normalizedHeading !== null ? (
                <>
                  <p className={`text-2xl font-bold tabular-nums ${isAligned ? 'text-emerald-500' : ''}`}>
                    {Math.round(normalizedHeading)}°
                  </p>
                  <p className={`text-xs mt-0.5 ${isAligned ? 'text-emerald-500/70' : 'text-muted-foreground/40'}`}>
                    {isAligned ? 'Menghadap Kiblat' : 'pusingkan peranti'}
                  </p>
                </>
              ) : (
                <p className="text-2xl font-bold tabular-nums text-muted-foreground/20">—</p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
