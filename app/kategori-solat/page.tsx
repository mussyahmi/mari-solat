'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatTime } from '@/utils/format';
import Sidebar from '@/components/Sidebar';
import Link from 'next/link';

const KATEGORI = [
  { id: 'fadhilat', title: 'Waktu Fadhilat', description: 'Waktu paling awal selepas azan. Paling banyak pahala.' },
  { id: 'ikhtiar', title: 'Waktu Ikhtiar', description: 'Kira-kira 15 minit selepas azan. Waktu yang diutamakan.' },
  { id: 'jawaz', title: 'Waktu Jawaz', description: 'Waktu yang harus. Boleh sembahyang tapi bukan waktu terbaik.' },
  { id: 'karahah', title: 'Waktu Karahah', description: 'Kira-kira 20 minit sebelum masuk waktu solat seterusnya. Makruh.' },
  { id: 'tahrim', title: 'Waktu Tahrim', description: 'Hampir masuk waktu lain. Haram melambatkan hingga ke sini dengan sengaja, namun solat tetap sah.' },
] as const;

type KategoriId = typeof KATEGORI[number]['id'];

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

function fmt12(d: Date) {
  const h = d.getHours() % 12 || 12;
  const m = d.getMinutes().toString().padStart(2, '0');
  const period = d.getHours() < 12 ? 'AM' : 'PM';
  return `${h}:${m} ${period}`;
}

// Fixed boundaries per window: 15 | 15 | middle | 20 | 5 minutes
function getKategoriWindows(start: Date, end: Date): Record<KategoriId, { from: Date; to: Date }> {
  const s = start.getTime();
  const e = end.getTime();
  const F = 15 * 60 * 1000;  // fadhilat: first 15 min
  const I = 15 * 60 * 1000;  // ikhtiar: next 15 min
  const K = 20 * 60 * 1000;  // karahah: last 20 min
  const T = 5 * 60 * 1000;   // tahrim: last 5 min
  return {
    fadhilat: { from: new Date(s),         to: new Date(s + F) },
    ikhtiar:  { from: new Date(s + F),     to: new Date(s + F + I) },
    jawaz:    { from: new Date(s + F + I), to: new Date(e - K) },
    karahah:  { from: new Date(e - K),     to: new Date(e - T) },
    tahrim:   { from: new Date(e - T),     to: new Date(e) },
  };
}

export default function KategoriSolatPage() {
  const [loading, setLoading] = useState(true);
  const [noZone, setNoZone] = useState(false);
  const [error, setError] = useState(false);
  const [now, setNow] = useState(new Date());
  const [prayerWindows, setPrayerWindows] = useState<{ name: string; start: Date; end: Date }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const zoneCode = localStorage.getItem('msolat_zone_code');
    if (!zoneCode) { setNoZone(true); setLoading(false); return; }

    const load = async () => {
      try {
        const today = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(today.getDate() + 1);

        const [td, tm] = await Promise.all([
          fetchSolat(zoneCode, today),
          fetchSolat(zoneCode, tomorrow),
        ]);

        const subuh   = parseTime(formatTime(td.prayerTime.fajr));
        const syuruk  = parseTime(formatTime(td.prayerTime.syuruk));
        const zohor   = parseTime(formatTime(td.prayerTime.dhuhr));
        const asar    = parseTime(formatTime(td.prayerTime.asr));
        const maghrib = parseTime(formatTime(td.prayerTime.maghrib));
        const isyak   = parseTime(formatTime(td.prayerTime.isha));
        const subuhTm = parseTime(formatTime(tm.prayerTime.fajr), tomorrow);

        setPrayerWindows([
          { name: 'Subuh',   start: subuh,   end: syuruk },
          { name: 'Zohor',   start: zohor,   end: asar },
          { name: 'Asar',    start: asar,    end: maghrib },
          { name: 'Maghrib', start: maghrib, end: isyak },
          { name: 'Isyak',   start: isyak,   end: subuhTm },
        ]);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const currentWindow = prayerWindows.find(w => now >= w.start && now < w.end) ?? null;
  const kategoriWindows = currentWindow ? getKategoriWindows(currentWindow.start, currentWindow.end) : null;
  const currentKategori: KategoriId | null = kategoriWindows
    ? (Object.entries(kategoriWindows).find(([, { from, to }]) => now >= from && now < to)?.[0] as KategoriId ?? null)
    : null;
  const currentKategoriEnd = currentKategori && kategoriWindows ? kategoriWindows[currentKategori].to : null;
  const countdownMs = currentKategoriEnd ? Math.max(currentKategoriEnd.getTime() - now.getTime(), 0) : 0;

  return (
    <div className="min-h-screen lg:flex">
      <Sidebar />

      <main className="flex-1 min-w-0 px-4 py-8 lg:px-10 lg:py-10 max-w-2xl mx-auto lg:mx-0 lg:max-w-none">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Kategori Waktu</h1>
          <p className="text-sm text-muted-foreground mt-1">5 kategori waktu dalam setiap waktu solat fardu.</p>
        </header>

        {/* Live status */}
        <div className="mb-10">
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-52" />
              <Skeleton className="h-3 w-40" />
            </div>
          ) : noZone ? (
            <p className="text-sm text-muted-foreground">
              Tiada zon dipilih.{' '}
              <Link href="/tetapan" className="text-primary">Pergi ke Tetapan →</Link>
            </p>
          ) : error ? (
            <p className="text-sm text-muted-foreground">Gagal memuatkan data.</p>
          ) : currentWindow && currentKategori ? (
            <>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-2">
                Sekarang · {currentWindow.name}
              </p>
              <p className="text-3xl font-bold">
                {KATEGORI.find(k => k.id === currentKategori)!.title}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Bertukar dalam{' '}
                <span className="font-semibold text-foreground tabular-nums">{formatCountdown(countdownMs)}</span>
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground/60 uppercase tracking-widest mb-2">Sekarang</p>
              <p className="text-2xl font-semibold text-muted-foreground">Di luar waktu solat</p>
            </>
          )}
        </div>

        {/* Kategori list */}
        <div className="divide-y divide-border/50">
          {KATEGORI.map((item, index) => {
            const isActive = item.id === currentKategori;
            const windows = kategoriWindows?.[item.id];
            const dimmed = !isActive && !!currentKategori;
            return (
              <div
                key={item.id}
                className={`py-4 flex gap-4 transition-opacity ${dimmed ? 'opacity-30' : ''}`}
              >
                <span className={`text-sm font-bold w-5 shrink-0 pt-0.5 ${isActive ? 'text-primary' : 'text-muted-foreground/30'}`}>
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{item.title}</p>
                    {isActive && (
                      <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                        Sekarang
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{item.description}</p>
                  {windows && currentWindow && (
                    <p className="text-xs text-muted-foreground/40 tabular-nums mt-1">
                      {fmt12(windows.from)} – {fmt12(windows.to)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
