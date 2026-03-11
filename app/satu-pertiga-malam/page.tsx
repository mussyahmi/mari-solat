'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/utils/format';
import Sidebar from '@/components/Sidebar';

function parseTime(time: string, baseDate?: Date): Date {
  const base = baseDate ? new Date(baseDate) : new Date();
  const [hourStr, rest] = time.split(':');
  const minute = Number(rest.split(' ')[0]);
  const period = time.includes('PM') ? 'PM' : 'AM';
  let hour = Number(hourStr);
  if (period === 'PM' && hour !== 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  base.setHours(hour, minute, 0, 0);
  return base;
}

async function fetchSolat(zone: string, date: Date) {
  const res = await fetch(
    `https://api.waktusolat.app/solat/${zone}/${date.getDate()}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`
  );
  const data = await res.json();
  if (!res.ok || data.status !== 'OK!') throw new Error();
  return data;
}

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

function formatCountdown(ms: number) {
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h} jam`);
  if (m > 0) parts.push(`${m} minit`);
  parts.push(`${s} saat`);
  return parts.join(' ');
}

export default function SatuPertigaMalamPage() {
  const [loading, setLoading] = useState(true);
  const [noZone, setNoZone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const [maghribLabel, setMaghribLabel] = useState('');
  const [subuhLabel, setSubuhLabel] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [maghribDate, setMaghribDate] = useState<Date | null>(null);
  const [durationMin, setDurationMin] = useState(0);
  const [thirdMin, setThirdMin] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const zoneCode = localStorage.getItem('msolat_zone_code');
    if (!zoneCode) {
      setNoZone(true);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const [todayRes, tomorrowRes] = await Promise.all([
          fetchSolat(zoneCode, today),
          fetchSolat(zoneCode, tomorrow),
        ]);

        const maghrib = parseTime(formatTime(todayRes.prayerTime.maghrib));
        const subuhBase = new Date(today);
        subuhBase.setDate(today.getDate() + 1);
        const subuh = parseTime(formatTime(tomorrowRes.prayerTime.fajr), subuhBase);

        const nightMs = subuh.getTime() - maghrib.getTime();
        const thirdMs = nightMs / 3;
        const start = new Date(subuh.getTime() - thirdMs);

        setMaghribLabel(formatTime(todayRes.prayerTime.maghrib));
        setSubuhLabel(formatTime(tomorrowRes.prayerTime.fajr));
        setStartDate(start);
        setEndDate(subuh);
        setMaghribDate(maghrib);
        setDurationMin(Math.round(nightMs / 60000));
        setThirdMin(Math.round(thirdMs / 60000));
      } catch {
        setError('Gagal memuatkan data. Sila cuba semula.');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const status: 'before' | 'active' | 'ended' | null =
    !startDate || !endDate ? null
    : now < startDate ? 'before'
    : now < endDate ? 'active'
    : 'ended';

  const timelineNowPct =
    maghribDate && endDate
      ? Math.min(Math.max(((now.getTime() - maghribDate.getTime()) / (endDate.getTime() - maghribDate.getTime())) * 100, 0), 100)
      : null;

  const thirdStartPct =
    maghribDate && startDate && endDate
      ? ((startDate.getTime() - maghribDate.getTime()) / (endDate.getTime() - maghribDate.getTime())) * 100
      : null;

  const countdownMs = startDate ? Math.max(startDate.getTime() - now.getTime(), 0) : 0;
  const remainingMs = endDate ? Math.max(endDate.getTime() - now.getTime(), 0) : 0;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-8 lg:px-10 lg:py-10 max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Satu Pertiga Malam</h1>
          <p className="text-sm text-muted-foreground mt-1">Waktu terbaik untuk qiamullail dan doa mustajab.</p>
        </header>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-14 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        ) : noZone ? (
          <p className="text-sm text-muted-foreground">
            Tiada zon dipilih.{' '}
            <Link href="/tetapan" className="text-primary">Pergi ke Tetapan →</Link>
          </p>
        ) : error ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : (
          <div className="space-y-10">

            {/* Main time display */}
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">
                {status === 'active' ? 'Sedang Berlangsung' : status === 'ended' ? 'Telah Berlalu' : 'Malam ini'}
              </p>
              <p className="text-5xl lg:text-6xl font-bold tabular-nums tracking-tight leading-none">
                {fmt12(startDate!)}{' '}
                <span className="text-3xl font-normal text-muted-foreground">–</span>{' '}
                {fmt12(endDate!)}{' '}
                <span className="text-2xl font-normal text-muted-foreground">AM</span>
              </p>

              <div className="mt-4 h-5">
                {status === 'before' && (
                  <p className="text-sm text-muted-foreground">
                    Bermula dalam{' '}
                    <span className="font-semibold text-foreground tabular-nums">{formatCountdown(countdownMs)}</span>
                  </p>
                )}
                {status === 'active' && (
                  <p className="text-sm font-medium" style={{ color: 'oklch(0.55 0.13 162)' }}>
                    Berakhir dalam <span className="tabular-nums">{formatCountdown(remainingMs)}</span>
                  </p>
                )}
                {status === 'ended' && (
                  <p className="text-sm text-muted-foreground/50">Waktu 1/3 malam telah berakhir.</p>
                )}
              </div>
            </div>

            {/* Timeline */}
            {thirdStartPct !== null && timelineNowPct !== null && (
              <div>
                <div className="relative h-1 bg-muted rounded-full">
                  {/* 1/3 malam highlight */}
                  <div
                    className="absolute top-0 h-full rounded-full"
                    style={{
                      left: `${thirdStartPct}%`,
                      right: '0%',
                      backgroundColor: status === 'active' ? 'oklch(0.55 0.13 162)' : undefined,
                      opacity: status === 'active' ? 1 : 0.25,
                      background: status !== 'active' ? 'var(--foreground)' : undefined,
                    }}
                  />
                  {/* Current time dot */}
                  {timelineNowPct > 0 && timelineNowPct < 100 && (
                    <div
                      className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground ring-2 ring-background"
                      style={{ left: `calc(${timelineNowPct}% - 4px)` }}
                    />
                  )}
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums">Maghrib · {maghribLabel}</span>
                  <span className="text-[10px] text-muted-foreground/40 tabular-nums">Subuh · {subuhLabel}</span>
                </div>
              </div>
            )}

            {/* Details */}
            <div className="divide-y divide-border/50">
              <div className="flex justify-between py-3">
                <span className="text-sm text-muted-foreground">Tempoh malam</span>
                <span className="text-sm font-medium tabular-nums">
                  {Math.floor(durationMin / 60)} jam {durationMin % 60} minit
                </span>
              </div>
              <div className="flex justify-between py-3">
                <span className="text-sm text-muted-foreground">Tempoh 1/3 malam</span>
                <span className="text-sm font-medium tabular-nums">
                  {Math.floor(thirdMin / 60)} jam {thirdMin % 60} minit
                </span>
              </div>
            </div>

            {/* Cara kiraan */}
            <div>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-3">Cara Kiraan</p>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-3"><span className="font-bold text-foreground/30 shrink-0">1</span><span>Kenal pasti waktu Maghrib dan Subuh esok</span></li>
                <li className="flex gap-3"><span className="font-bold text-foreground/30 shrink-0">2</span><span>Kira tempoh malam: Subuh − Maghrib</span></li>
                <li className="flex gap-3"><span className="font-bold text-foreground/30 shrink-0">3</span><span>Bahagikan kepada 3 bahagian sama rata</span></li>
                <li className="flex gap-3"><span className="font-bold text-foreground/30 shrink-0">4</span><span>1/3 malam terakhir bermula pada Subuh − (tempoh 1/3 malam)</span></li>
              </ol>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
