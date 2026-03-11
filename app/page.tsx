"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPrayerDates, formatShortDate, formatTime } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";

type Prayer = {
  label: keyof PrayerTimes | null;
  time: Date | null;
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

const PRAYERS = ["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"] as const;

export default function HomePage() {
  const [zone, setZone] = useState<string | null>(null);
  const [allTimes, setAllTimes] = useState<PrayerDataByDay>({});
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [countdownPrayer, setCountdownPrayer] = useState("");
  const [nextPrayer, setNextPrayer] = useState<Prayer>({ label: null, time: null });
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isManualMode, setIsManualMode] = useState(false);
  const [isInitialize, setIsInitialize] = useState(false);

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

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
        try {
          const { latitude, longitude } = coords;
          setCoords({ lat: latitude, lng: longitude });
          const zoneRes = await fetch(`https://api.waktusolat.app/zones/${latitude}/${longitude}`);
          const zoneData = await zoneRes.json();
          if (!zoneRes.ok || "error" in zoneData) throw new Error();
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
      setNextPrayer({ label: null, time: null });
      setCountdownPrayer("");
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
      setNextPrayer({ label: null, time: t });
      setCountdownPrayer("");
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
    setNextPrayer({ label: nextLabel, time: nextTime });
    setCountdownPrayer(formatCountdown(nextTime));
  };

  const currentTimes = allTimes[selectedDay];
  const isToday = selectedDay === "today";

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden">

      <Sidebar />

      {/* ── MAIN CONTENT ──────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto">

        {/* Top bar */}
        <div className="border-b border-border/40 shrink-0 px-4 lg:px-10">
          <div className="flex items-center justify-between py-3 gap-3">
            <div className="min-w-0 flex-1 text-center lg:text-left">
              {currentTimes ? (
                <p className="text-xs text-muted-foreground/50">{formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate)}</p>
              ) : <Skeleton className="h-3 w-36 mx-auto lg:mx-0" />}
              {zone
                ? <p className="text-sm font-medium mt-0.5">{zone}</p>
                : <Skeleton className="h-4 w-32 mt-1 mx-auto lg:mx-0" />
              }
            </div>
            <div className="hidden lg:block shrink-0">
              <ButtonGroup>
                {(["yesterday", "today", "tomorrow"] as const).map((day) => (
                  <Button
                    key={day}
                    variant={selectedDay === day ? "default" : "outline"}
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
                  variant={selectedDay === day ? "default" : "outline"}
                  onClick={() => setSelectedDay(day)}
                  size="sm"
                >
                  <span className="text-xs">{day === "yesterday" ? "Semalam" : day === "today" ? "Hari Ini" : "Esok"}</span>
                </Button>
              ))}
            </ButtonGroup>
          </div>
        </div>

        {/* Hero — next prayer */}
        <div className="flex-1 flex flex-col justify-center px-4 lg:px-10 py-10">
          {isToday && nextPrayer.label ? (
            <>
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest mb-4 text-center lg:text-left">Waktu Seterusnya</p>
              <div className="flex flex-col items-center lg:flex-row lg:items-end lg:justify-between gap-4 lg:gap-6">
                <div className="text-center lg:text-left">
                  <p className="text-lg font-medium text-muted-foreground mb-1">{capitalize(nextPrayer.label)}</p>
                  <p className="text-6xl lg:text-8xl font-bold tabular-nums tracking-tight leading-none">
                    {currentTimes ? currentTimes[nextPrayer.label] : <Skeleton className="h-20 w-52 inline-block" />}
                  </p>
                </div>
                <div className="text-center lg:text-right pb-1">
                  <p className="text-base text-muted-foreground tabular-nums">{countdownPrayer} lagi</p>
                  {!isManualMode && coords && (
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/masjid/@${coords.lat},${coords.lng},15z`, "_blank")}
                      className="text-xs text-muted-foreground/30 mt-2 hover:text-muted-foreground transition flex items-center gap-1 mx-auto lg:ml-auto lg:mr-0"
                    >
                      <SearchIcon className="size-3" /> Cari Masjid
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : isToday && !nextPrayer.label && allTimes.today ? (
            <>
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest mb-4">Semua Solat Selesai</p>
              <p className="text-2xl font-semibold text-muted-foreground">
                Subuh esok · {allTimes.tomorrow?.subuh}
              </p>
            </>
          ) : !allTimes.today ? (
            isManualMode ? (
              <div className="text-center lg:text-left">
                <p className="text-muted-foreground text-sm mb-3">Tiada zon dipilih.</p>
                <Link href="/tetapan" className="text-sm text-primary">Pergi ke Tetapan →</Link>
              </div>
            ) : (
              <div className="flex flex-col items-center lg:items-start space-y-4">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-16 w-52 lg:h-20 lg:w-64" />
              </div>
            )
          ) : (
            <>
              <p className="text-xs text-muted-foreground/40 uppercase tracking-widest mb-4">
                {selectedDay === "yesterday" ? "Waktu Semalam" : "Waktu Esok"}
              </p>
              <p className="text-4xl lg:text-5xl font-bold text-muted-foreground/20 tabular-nums">
                {selectedDay === "yesterday" ? formatShortDate(dayDates.yesterday) : formatShortDate(dayDates.tomorrow)}
              </p>
            </>
          )}
        </div>

        {/* Prayer strip — bottom */}
        <div className="border-t border-border/40 shrink-0">
          <div className="grid grid-cols-3 lg:grid-cols-6">
            {PRAYERS.map((label, i) => {
              const isNext = nextPrayer.label === label && isToday;
              const col = i % 3;
              const isFirstRow = i < 3;
              return (
                <div
                  key={label}
                  className={[
                    "px-4 py-4 lg:py-5 flex flex-col gap-1",
                    isNext ? "bg-primary/[0.04]" : "",
                    col < 2 ? "border-r border-border/40" : "",
                    isFirstRow ? "border-b border-border/40 lg:border-b-0" : "",
                    i < 5 ? "lg:border-r lg:border-border/40" : "",
                  ].join(" ")}
                >
                  <span className={`text-[11px] font-medium ${isNext ? "text-primary" : "text-muted-foreground/50"}`}>
                    {capitalize(label)}
                  </span>
                  <span className={`text-sm font-bold tabular-nums ${isNext ? "text-primary" : ""}`}>
                    {currentTimes ? currentTimes[label] : <Skeleton className="h-4 w-12" />}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </main>

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

function formatCountdown(target: Date) {
  const now = new Date();
  let diff = Math.max(target.getTime() - now.getTime(), 0);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  diff -= hours * 1000 * 60 * 60;
  const minutes = Math.floor(diff / (1000 * 60));
  diff -= minutes * 1000 * 60;
  const seconds = Math.floor(diff / 1000);
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} jam`);
  if (minutes > 0) parts.push(`${minutes} minit`);
  parts.push(`${seconds} saat`);
  return parts.join(" ");
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
