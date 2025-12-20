"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/* ---------------- Helpers ---------------- */
function getQiblaBearing(lat: number, lng: number) {
  const kaabaLat = 21.422487;
  const kaabaLng = 39.826206;

  const toRad = (d: number) => (d * Math.PI) / 180;
  const toDeg = (r: number) => (r * 180) / Math.PI;

  const φ1 = toRad(lat);
  const φ2 = toRad(kaabaLat);
  const Δλ = toRad(kaabaLng - lng);

  const y = Math.sin(Δλ);
  const x = Math.cos(φ1) * Math.tan(φ2) - Math.sin(φ1) * Math.cos(Δλ);

  let θ = toDeg(Math.atan2(y, x));
  return (θ + 360) % 360;
}

function useCompassHeading() {
  const [heading, setHeading] = useState<number | null>(null);
  const lastHeadingRef = useRef<number | null>(null);

  useEffect(() => {
    const handler = (e: DeviceOrientationEvent) => {
      // Use webkitCompassHeading for iOS, alpha for Android
      const event = e as any;
      let newHeading: number | null = null;

      if (event.webkitCompassHeading !== undefined) {
        newHeading = event.webkitCompassHeading;
      } else if (e.alpha !== null) {
        // For non-iOS devices, adjust alpha to get compass heading
        newHeading = 360 - e.alpha;
      }

      if (newHeading !== null) {
        // Normalize to 0-360
        newHeading = ((newHeading % 360) + 360) % 360;

        // Handle wrapping around 0/360 to prevent spinning
        if (lastHeadingRef.current !== null) {
          const diff = newHeading - lastHeadingRef.current;

          // If difference is > 180, we crossed the 0/360 boundary
          if (diff > 180) {
            newHeading -= 360;
          } else if (diff < -180) {
            newHeading += 360;
          }
        }

        lastHeadingRef.current = newHeading;
        setHeading(newHeading);
      }
    };

    // Try absolute orientation first (more reliable)
    window.addEventListener("deviceorientationabsolute" as any, handler, true);
    window.addEventListener("deviceorientation", handler, true);

    return () => {
      window.removeEventListener("deviceorientationabsolute" as any, handler);
      window.removeEventListener("deviceorientation", handler);
    };
  }, []);

  return heading;
}

function requestMotionPermission(setGranted: (v: boolean) => void) {
  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof (DeviceOrientationEvent as any).requestPermission === "function"
  ) {
    (DeviceOrientationEvent as any).requestPermission()
      .then((res: string) => {
        if (res === "granted") {
          setGranted(true);
        }
      })
      .catch((err: Error) => {
        console.error("Permission denied:", err);
        setGranted(false);
      });
  } else {
    // For Android or browsers that don't require permission
    setGranted(true);
  }
}

/* ---------------- Component ---------------- */
type QiblaCardProps = {
  lat: number;
  lng: number;
};

export default function QiblaCard({ lat, lng }: QiblaCardProps) {
  const heading = useCompassHeading();
  const [motionGranted, setMotionGranted] = useState(false);
  const alignedRef = useRef(false);

  const qibla = getQiblaBearing(lat, lng);

  useEffect(() => {
    if (heading !== null) {
      setMotionGranted(true);
    }
  }, [heading]);

  const rotation = heading !== null ? (qibla - heading + 360) % 360 : 0;

  const alignmentError =
    heading !== null
      ? Math.min(Math.abs(rotation), Math.abs(rotation - 360))
      : null;

  const isAligned = alignmentError !== null && alignmentError <= 5;

  /* Haptic feedback – trigger once per alignment */
  useEffect(() => {
    if (isAligned && !alignedRef.current) {
      alignedRef.current = true;

      if ("vibrate" in navigator) {
        navigator.vibrate(40);
      }
    }

    if (!isAligned) {
      alignedRef.current = false;
    }
  }, [isAligned]);

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>Arah Kiblat</CardTitle>
        <CardDescription>Kompas berorientasikan Kaabah</CardDescription>
      </CardHeader>

      <CardContent className="flex flex-col items-center gap-5">
        {/* Compass */}
        <div className="relative w-56 h-56">
          {/* Rotating compass face */}
          <div
            className={`
              absolute inset-0 rounded-full
              bg-gradient-to-b
              from-zinc-100 to-zinc-200
              dark:from-zinc-800 dark:to-zinc-900
              border-4
              ${isAligned
                ? "border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.6)]"
                : "border-zinc-300 dark:border-zinc-700"
              }
              shadow-inner
              transition-all duration-700 ease-out
            `}
            style={{ transform: `rotate(${heading !== null ? -heading : 0}deg)` }}
          >
            {/* Cardinal directions */}
            {[
              { label: "U", angle: 0 },
              { label: "T", angle: 90 },
              { label: "S", angle: 180 },
              { label: "B", angle: 270 },
            ].map((d) => (
              <span
                key={d.label}
                className="absolute text-xs font-bold text-zinc-600 dark:text-zinc-300 transition-transform duration-700 ease-out"
                style={{
                  top: "50%",
                  left: "50%",
                  transform: `translate(-50%, -50%) rotate(${d.angle}deg) translateY(-100px)`,
                }}
              >
                {d.label}
              </span>
            ))}

            {/* Line from center to Qibla - rotates with compass */}
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `rotate(${qibla}deg)`,
              }}
            >
              <div
                className="absolute w-1 bg-emerald-500 dark:bg-emerald-400 opacity-60 rounded-full"
                style={{
                  height: '104px',
                  top: '50%',
                  transform: 'translateY(-100%)',
                  transformOrigin: 'bottom center'
                }}
              />
            </div>
          </div>

          {/* Arrow - points to Qibla when inactive, points up when active */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-all duration-700 ease-out"
            style={{
              transform: `rotate(${heading !== null ? 0 : qibla}deg)`,
              opacity: 1
            }}
          >
            {/* Arrow tip */}
            <div
              className="
                w-0 h-0
                border-l-[14px] border-r-[14px] border-b-[36px]
                border-l-transparent border-r-transparent
                border-b-emerald-600 dark:border-b-emerald-400
                drop-shadow-lg
              "
            />
          </div>

          {/* Center */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 dark:bg-zinc-400" />
          </div>
        </div>

        {/* Degree */}
        <div className="text-center">
          <div className="text-2xl font-bold">{Math.round(qibla)}°</div>
          <div className="text-sm text-muted-foreground">Dari arah Utara</div>

          {isAligned && (
            <div className="text-emerald-600 dark:text-emerald-400 text-sm font-semibold mt-1">
              ✔ Menghadap Kiblat ({heading !== null ? Math.round(heading) : 0}°)
            </div>
          )}
        </div>

        {/* Permission */}
        {!motionGranted && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => requestMotionPermission(setMotionGranted)}
          >
            Aktifkan Kompas
          </Button>
        )}

        {heading === null && motionGranted && (
          <div className="text-xs text-muted-foreground text-center">
            Peranti ini tidak menyokong sensor kompas.
          </div>
        )}
      </CardContent>
    </Card>
  );
}