"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { formatPrayerDates, formatShortDate, formatTime } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Maximize2, Minimize2 } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import { isManualZone } from "@/lib/zoneState";
import { trackVisit } from "@/lib/track";
import { AZAN_PRAYERS, isGlobalAzanOn, isAzanEnabled, triggerAzan } from "@/lib/azan";

type Prayer = {
  label: keyof PrayerTimes | null;
  time: Date | null;
  currentStart: Date | null;
}

type PrayerTimes = {
  subuh: string;
  syuruk: string;
  zohor: string;
  asar: string;
  maghrib: string;
  isyak: string;
  gregorianDate: string;
  hijriDate: string;
};

type PrayerDataByDay = {
  yesterday?: PrayerTimes;
  today?: PrayerTimes;
  tomorrow?: PrayerTimes;
};

type CountdownParts = { hours: number; minutes: number; seconds: number };

const PRAYERS = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"] as const;

export default function HomePage() {
  const [zone, setZone] = useState<string | null>(null);
  const [allTimes, setAllTimes] = useState<PrayerDataByDay>({});
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [nextPrayer, setNextPrayer] = useState<Prayer>({ label: null, time: null, currentStart: null });
  const [isManualMode, setIsManualMode] = useState(false);
  const [isInitialize, setIsInitialize] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  useEffect(() => {
    document.body.classList.toggle('focus-mode', isFocusMode);
    return () => document.body.classList.remove('focus-mode');
  }, [isFocusMode]);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const lastTriggered = useRef('');
  useEffect(() => {
    if (!allTimes.today) return;
    const times = allTimes.today;
    const key = now.toDateString();
    const hhmm = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;
    for (const prayer of AZAN_PRAYERS) {
      const t = parseTime(times[prayer as keyof PrayerTimes] as string);
      const tHHMM = `${t.getHours()}:${String(t.getMinutes()).padStart(2, '0')}`;
      const triggerId = `${prayer}-${key}-${tHHMM}`;
      if (hhmm === tHHMM && lastTriggered.current !== triggerId && isGlobalAzanOn() && isAzanEnabled(prayer)) {
        lastTriggered.current = triggerId;
        triggerAzan(prayer);
      }
    }
  }, [now, allTimes]);

  const dayDates = {
    yesterday: new Date(now.getTime() - 86400000),
    today: now,
    tomorrow: new Date(now.getTime() + 86400000),
  };

  useEffect(() => {
    const savedCode = localStorage.getItem('msolat_zone_code');
    const savedName = localStorage.getItem('msolat_zone_name');
    if (savedCode && savedName) {
      loadZoneData(savedCode, savedName);
      // Silently check if user is in a different zone (only if not manually set)
      const isManual = isManualZone();
      if (!isManual && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async ({ coords }) => {
            try {
              const { latitude, longitude } = coords;
              const res = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
              const data = await res.json();
              if (res.ok && !('error' in data)) {
                trackVisit(latitude, longitude, data.zone);
                if (data.zone !== savedCode) {
                  await loadZoneData(data.zone, `${data.zone} · ${data.district}`);
                }
              }
            } catch { /* silent */ }
          },
          () => {},
          { enableHighAccuracy: true, timeout: 10000 }
        );
      }
    } else {
      requestLocation();
    }
  }, []);

  useEffect(() => {
    if (!allTimes.today) return;
    updateNextPrayer();
    const interval = setInterval(updateNextPrayer, 1000);
    return () => clearInterval(interval);
  }, [allTimes, selectedDay]);

  useEffect(() => {
    if (!allTimes.today || isInitialize || selectedDay != "today") return;
    const t = parseTime(allTimes.tomorrow!.subuh);
    t.setDate(t.getDate() + 1);
    if (nextPrayer.time != null && nextPrayer.time >= t) {
      setSelectedDay("tomorrow");
      setIsInitialize(true);
    }
  }, [allTimes, selectedDay, nextPrayer.time]);

  const requestLocation = () => {
    setIsManualMode(false);
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak disokong oleh pelayar anda.");
      setIsManualMode(true);
      return;
    }
    const timeoutId = setTimeout(() => { setIsManualMode(true); }, 10000);
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(timeoutId);
        setIsManualMode(false);
        try {
          const { latitude, longitude } = coords;
          const zoneRes = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
          const zoneData = await zoneRes.json();
          if (!zoneRes.ok || "error" in zoneData) throw new Error();
          trackVisit(latitude, longitude, zoneData.zone);
          await loadZoneData(zoneData.zone, `${zoneData.zone} · ${zoneData.district}`);
        } catch {
          toast.error("Tiada zon ditemui. Sila tetapkan zon di halaman Tetapan.");
          setIsManualMode(true);
        }
      },
      () => {
        clearTimeout(timeoutId);
        toast.error("Lokasi tidak dapat diakses. Sila tetapkan zon di halaman Tetapan.");
        setIsManualMode(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const loadZoneData = async (zoneCode: string, zoneName: string) => {
    try {
      setZone(zoneName);
      localStorage.setItem('msolat_zone_code', zoneCode);
      localStorage.setItem('msolat_zone_name', zoneName);
      const days: ("yesterday" | "today" | "tomorrow")[] = ["yesterday", "today", "tomorrow"];
      const timesByDay: PrayerDataByDay = {};
      for (const day of days) {
        const date = new Date();
        if (day === "yesterday") date.setDate(date.getDate() - 1);
        if (day === "tomorrow") date.setDate(date.getDate() + 1);
        const solatData = await fetchSolat(zoneCode, date);
        timesByDay[day] = {
          subuh: formatTime(solatData.prayerTime.fajr),
          syuruk: formatTime(solatData.prayerTime.syuruk),
          zohor: formatTime(solatData.prayerTime.dhuhr),
          asar: formatTime(solatData.prayerTime.asr),
          maghrib: formatTime(solatData.prayerTime.maghrib),
          isyak: formatTime(solatData.prayerTime.isha),
          gregorianDate: solatData.prayerTime.date,
          hijriDate: solatData.prayerTime.hijri,
        };
      }
      setAllTimes(timesByDay);
    } catch {
      toast.error("Gagal memuatkan waktu solat untuk zon ini.");
    }
  };

  const updateNextPrayer = () => {
    const times = allTimes.today;
    if (!times) return;
    const now = new Date();
    if (selectedDay == "yesterday" || selectedDay == 'tomorrow' && now < parseTime(times.isyak)) {
      setNextPrayer({ label: null, time: null, currentStart: null });
      return;
    }
    const prayers: { label: keyof PrayerTimes; time: string }[] = [
      { label: "subuh", time: times.subuh },
      { label: "syuruk", time: times.syuruk },
      { label: "zohor", time: times.zohor },
      { label: "asar", time: times.asar },
      { label: "maghrib", time: times.maghrib },
      { label: "isyak", time: times.isyak },
    ];
    let currentLabel, nextLabel: keyof PrayerTimes | null = null;
    let currentTime, nextTime: Date | null = null;
    for (const p of prayers) {
      const t = parseTime(p.time);
      if (selectedDay == 'tomorrow') t.setDate(t.getDate() + 1);
      if (t > now) { nextLabel = p.label; nextTime = t; break; }
      currentLabel = p.label;
      currentTime = t;
    }
    if (!nextTime) {
      const t = parseTime(allTimes.tomorrow!.subuh);
      t.setDate(t.getDate() + 1);
      setNextPrayer({ label: null, time: t, currentStart: null });
      return;
    }
    if (!currentLabel || !currentTime) {
      currentLabel = 'isyak' as keyof PrayerTimes;
      currentTime = parseTime(allTimes.today!.isyak);
      if (selectedDay == 'today' && nextTime >= parseTime(allTimes.today!.subuh)) {
        currentTime = parseTime(allTimes.yesterday!.isyak);
        currentTime.setDate(currentTime.getDate() - 1);
      }
    }
    setNextPrayer({ label: nextLabel, time: nextTime, currentStart: currentTime });
  };

  const currentTimes = allTimes[selectedDay];
  const isToday = selectedDay === "today";
  const isAutoTomorrow = selectedDay === "tomorrow" && isInitialize;
  const showNextPrayerHero = (isToday || isAutoTomorrow) && !!nextPrayer.label;
  const nowFloored = new Date(Math.floor(now.getTime() / 1000) * 1000);
  const countdown = nextPrayer.time && showNextPrayerHero ? parseCountdown(nextPrayer.time, nowFloored) : null;

  const liveClockFull = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
  const [liveClockHMS, liveClockPeriod] = liveClockFull.split(' ');
  const liveDate = now.toLocaleDateString('ms-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });


  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">

      {!isFocusMode && <Sidebar />}

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Top bar */}
        {!isFocusMode && <div className="shrink-0 px-4 lg:px-10">
          <div className="flex items-center justify-center py-4 gap-3">
            <div className="hidden lg:block shrink-0">
              <ButtonGroup>
                {(["yesterday", "today", "tomorrow"] as const).map((day) => (
                  <Button
                    key={day}
                    variant="outline"
                    className={selectedDay === day ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:text-primary" : ""}
                    onClick={() => setSelectedDay(day)}
                    size="sm"
                  >
                    <span className="text-xs">{day === "yesterday" ? "Semalam" : day === "today" ? "Hari Ini" : "Esok"}</span>
                    <span className="text-[10px] opacity-40 font-normal ml-1">{formatShortDate(dayDates[day])}</span>
                  </Button>
                ))}
              </ButtonGroup>
            </div>
          </div>
          {/* Mobile day selector — full width below zone info */}
          <div className="flex lg:hidden pb-3">
            <ButtonGroup className="w-full [&>button]:flex-1 [&>button]:justify-center">
              {(["yesterday", "today", "tomorrow"] as const).map((day) => (
                <Button
                  key={day}
                  variant="outline"
                    className={selectedDay === day ? "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15 hover:text-primary" : ""}
                  onClick={() => setSelectedDay(day)}
                  size="sm"
                >
                  <span className="text-xs">{day === "yesterday" ? "Semalam" : day === "today" ? "Hari Ini" : "Esok"}</span>
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>}

        {/* Hero — next prayer */}
        <div className="flex-1 min-h-[480px] flex flex-col justify-center items-center px-4 lg:px-10 py-12 relative">
          <div className="absolute bottom-4 right-4 flex items-center gap-3">
            <button
              onClick={() => setIsFocusMode(f => !f)}
              className="text-muted-foreground/30 hover:text-muted-foreground transition"
            >
              {isFocusMode ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </button>
          </div>
          {showNextPrayerHero ? (
            <div className="w-full flex flex-col items-center">
              {isFocusMode ? (
                <>
                  {/* Date */}
                  <p className="text-xs text-muted-foreground/40 tracking-wide mb-5">{currentTimes ? formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate) : liveDate}</p>
                  {/* Live clock */}
                  <p className="text-[4rem] lg:text-[8rem] font-bold tabular-nums tracking-tight leading-none text-foreground/25">
                    {liveClockHMS}
                    <span className="text-[1.5rem] lg:text-[3rem] font-medium ml-2 align-middle opacity-60">{liveClockPeriod}</span>
                  </p>
                  <div className="mb-10" />
                  {/* Prayer name — primary anchor */}
                  <p className="text-4xl lg:text-6xl font-display mb-3 tracking-tight">{capitalize(nextPrayer.label!)}</p>
                  {/* Prayer time — secondary */}
                  <p className="text-sm text-muted-foreground/40 tabular-nums mb-6 font-light tracking-wider">
                    {currentTimes ? currentTimes[nextPrayer.label!] : '—'}
                  </p>
                  {countdown && <CountdownFlip parts={countdown} />}
                  {zone && <Link href="/tetapan" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/50 uppercase tracking-widest mt-8 transition">{zone}</Link>}
                </>
              ) : (
                <>
                  {/* Date */}
                  <p className="text-xs text-muted-foreground/40 tracking-wide mb-5">{currentTimes ? formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate) : liveDate}</p>
                  {/* Live clock */}
                  <p className="text-[4rem] lg:text-[8rem] font-bold tabular-nums tracking-tight leading-none text-foreground/25">
                    {liveClockHMS}
                    <span className="text-[1.5rem] lg:text-[3rem] font-medium ml-2 align-middle opacity-60">{liveClockPeriod}</span>
                  </p>
                  <div className="mb-10" />
                  {/* Prayer name — primary anchor */}
                  <p className="text-4xl lg:text-6xl font-display mb-3 tracking-tight">{capitalize(nextPrayer.label!)}</p>
                  {/* Prayer time — secondary */}
                  <p className="text-sm text-muted-foreground/40 tabular-nums mb-6 font-light tracking-wider">
                    {currentTimes ? currentTimes[nextPrayer.label!] : <Skeleton className="h-4 w-20 inline-block" />}
                  </p>
                  {countdown && <CountdownFlip parts={countdown} />}
                  {zone && <Link href="/tetapan" className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground/50 uppercase tracking-widest mt-8 transition">{zone}</Link>}
                </>
              )}
            </div>
          ) : isToday && !nextPrayer.label && allTimes.today ? (
            <div className="text-center">
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest mb-5 font-medium">Waktu Hari Ini</p>
              <p className="text-6xl lg:text-8xl font-display text-muted-foreground/40 tabular-nums">
                {formatShortDate(dayDates.today)}
              </p>
            </div>
          ) : !allTimes.today ? (
            isManualMode ? (
              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-3">Tiada zon dipilih.</p>
                <Link href="/tetapan" className="text-sm text-primary">Pergi ke Tetapan →</Link>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <Skeleton className="h-12 lg:h-16 w-40 lg:w-56 mb-2" />
                <Skeleton className="h-4 w-20 mb-8" />
                <div className="flex gap-3 lg:gap-5">
                  {[0, 1].map(u => (
                    <div key={u} className="flex flex-col items-center gap-2.5">
                      <div className="flex gap-1">
                        <Skeleton className="w-11 lg:w-[4.5rem] h-16 lg:h-[5.5rem] rounded-xl" />
                        <Skeleton className="w-11 lg:w-[4.5rem] h-16 lg:h-[5.5rem] rounded-xl" />
                      </div>
                      <Skeleton className="h-2 w-8" />
                    </div>
                  ))}
                </div>
              </div>
            )
          ) : (
            <div className="text-center">
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest mb-5 font-medium">
                {selectedDay === "yesterday" ? "Waktu Semalam" : "Waktu Esok"}
              </p>
              <p className="text-6xl lg:text-8xl font-display text-muted-foreground/40 tabular-nums">
                {selectedDay === "yesterday" ? formatShortDate(dayDates.yesterday) : formatShortDate(dayDates.tomorrow)}
              </p>
            </div>
          )}

        </div>

        {/* Prayer strip — bottom */}
        {!isFocusMode && <div className="border-t border-border/40 shrink-0 text-center">
          <div className="grid grid-cols-3 lg:grid-cols-6">
            {PRAYERS.map((label, i) => {
              const isNext = nextPrayer.label === label && (isToday || isAutoTomorrow);
              const isPast = isToday && !isNext && !!currentTimes && parseTime(currentTimes[label] as string) < now;
              const col = i % 3;
              const isFirstRow = i < 3;
              return (
                <div
                  key={label}
                  className={[
                    "relative px-3 py-5 lg:py-6 flex flex-col items-center gap-1.5 transition-colors",
                    isNext ? "bg-primary/[0.05]" : "",
                    col < 2 ? "border-r border-border/40" : "",
                    isFirstRow ? "border-b border-border/40 lg:border-b-0" : "",
                    i < 5 ? "lg:border-r lg:border-border/40" : "",
                  ].join(" ")}
                >
                  <span className={`text-[11px] font-semibold tracking-wide ${isNext ? "text-primary" : isPast ? "text-muted-foreground/30" : "text-muted-foreground/45"}`}>
                    {capitalize(label)}
                  </span>
                  <span className={`text-sm font-bold tabular-nums tracking-tight ${isNext ? "text-primary" : isPast ? "text-muted-foreground/40" : "text-foreground/80"}`}>
                    {currentTimes ? currentTimes[label] : <Skeleton className="h-4 w-12" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>}

      </main>

    </div>
  );
}


/* ---------------- Countdown cards ---------------- */

function CountdownFlip({ parts }: { parts: CountdownParts }) {
  const units = [
    ...(parts.hours > 0 ? [{ value: String(parts.hours), label: 'jam' }] : []),
    { value: String(parts.minutes).padStart(2, '0'), label: 'minit' },
    { value: String(parts.seconds).padStart(2, '0'), label: 'saat' },
  ];
  return (
    <div className="flex items-end gap-4 lg:gap-6">
      {units.map(({ value, label }) => (
        <div key={label} className="flex flex-col items-center gap-3">
          <div className="flex gap-1.5">
            {value.split('').map((d, i) => (
              <div key={i} className="w-12 lg:w-20 h-[4.5rem] lg:h-24 bg-card border border-border/60 shadow-sm rounded-2xl flex items-center justify-center overflow-hidden">
                <span
                  key={d}
                  className="text-[2rem] lg:text-[3.25rem] font-bold tabular-nums text-foreground leading-none"
                  style={{ animation: 'digitIn 200ms ease-out' }}
                >
                  {d}
                </span>
              </div>
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground/40 uppercase tracking-widest font-medium">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Helpers ---------------- */

async function fetchSolat(zone: string, date: Date) {
  const res = await fetch(
    `https://api.waktusolat.app/solat/${zone}/${date.getDate()}?year=${date.getFullYear()}&month=${date.getMonth() + 1}`
  );
  const data = await res.json();
  if (!res.ok || data.status !== "OK!") throw new Error();
  return data;
}

function parseTime(time: string) {
  const [hourStr, minuteStr] = time.split(":");
  let hour = Number(hourStr);
  const minute = Number(minuteStr.split(" ")[0]);
  const period = time.split(" ")[1];
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date;
}

function parseCountdown(target: Date, from: Date): CountdownParts {
  let diff = Math.max(target.getTime() - from.getTime(), 0);
  const hours = Math.floor(diff / 3600000);
  diff -= hours * 3600000;
  const minutes = Math.floor(diff / 60000);
  diff -= minutes * 60000;
  const seconds = Math.floor(diff / 1000);
  return { hours, minutes, seconds };
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
