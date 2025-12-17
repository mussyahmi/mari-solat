"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPrayerDates, formatTime } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";

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

export default function HomePage() {
  const [zone, setZone] = useState<string | null>(null);
  const [allTimes, setAllTimes] = useState<PrayerDataByDay>({});
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [nextPrayer, setNextPrayer] = useState<keyof PrayerTimes | null>(null);
  const [countdown, setCountdown] = useState("");

  // Fetch location and prayers once
  useEffect(() => {
    requestLocation();
  }, []);

  // Update countdown every second (only for today)
  useEffect(() => {
    if (!allTimes.today) return;
    updateNextPrayer();
    const interval = setInterval(updateNextPrayer, 1000);
    return () => clearInterval(interval);
  }, [allTimes]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak disokong oleh pelayar anda.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;

          const zoneRes = await fetch(
            `https://api.waktusolat.app/zones/${latitude}/${longitude}`
          );
          const zoneData = await zoneRes.json();
          if (!zoneRes.ok || "error" in zoneData) throw new Error();

          setZone(`${zoneData.zone} · ${zoneData.district}`);

          // Fetch prayers for all three days
          const days: ("yesterday" | "today" | "tomorrow")[] = ["yesterday", "today", "tomorrow"];
          const timesByDay: PrayerDataByDay = {};

          for (const day of days) {
            const date = new Date();
            if (day === "yesterday") date.setDate(date.getDate() - 1);
            if (day === "tomorrow") date.setDate(date.getDate() + 1);

            const solatData = await fetchSolat(zoneData.zone, date);

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
          toast.success("Waktu solat dimuatkan.");
        } catch {
          toast.error("Tiada zon ditemui untuk lokasi semasa anda.");
        }
      },
      () => {
        toast.error("Tidak dapat mengakses lokasi. Benarkan lokasi dan cuba semula.");
      },
      { enableHighAccuracy: true }
    );
  };

  const updateNextPrayer = () => {
    if (selectedDay == "yesterday") {
      setNextPrayer(null);
      setCountdown("");
      return;
    }

    const times = allTimes.today;
    if (!times) return;

    const now = new Date();
    const prayers: { label: keyof PrayerTimes; time: string }[] = [
      { label: "subuh", time: times.subuh },
      { label: "syuruk", time: times.syuruk },
      { label: "zohor", time: times.zohor },
      { label: "asar", time: times.asar },
      { label: "maghrib", time: times.maghrib },
      { label: "isyak", time: times.isyak },
    ];

    let next: keyof PrayerTimes | null = null;
    let targetTime: Date | null = null;

    for (const p of prayers) {
      const t = parseTime(p.time);
      if (t > now) {
        next = p.label;
        targetTime = t;
        break;
      }
    }

    // If all prayers passed, default to next day's subuh
    if (!next) {
      next = "subuh";
      targetTime = parseTime(allTimes.today!.subuh);
      targetTime.setDate(targetTime.getDate() + 1);

      if (selectedDay == "today") {
        setNextPrayer(null);
        setCountdown("");
        return;
      }
    } else {
      if (selectedDay == "tomorrow") {
        setNextPrayer(null);
        setCountdown("");
        return;
      }
    }

    setNextPrayer(next);
    if (targetTime) setCountdown(formatCountdown(targetTime));
  };

  const currentTimes = allTimes[selectedDay];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          {zone ?? <Skeleton className="h-6 w-64" />}
        </h1>
        {currentTimes ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate)}
          </p>
        ) : (
          <Skeleton className="h-4 w-64 mt-1" />
        )}
      </div>

      {/* Day Selector Buttons */}
      <ButtonGroup>
        {["yesterday", "today", "tomorrow"].map((day) => (
          <Button
            key={day}
            variant={selectedDay === day ? "default" : "outline"}
            onClick={() => setSelectedDay(day as "yesterday" | "today" | "tomorrow")}
          >
            {day === "yesterday"
              ? "Semalam"
              : day === "today"
                ? "Hari Ini"
                : "Esok"}
          </Button>
        ))}
      </ButtonGroup>

      {/* Prayer List */}
      <div className="w-full max-w-md space-y-3">
        {["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"].map((label) => (
          <PrayerRow
            key={label}
            label={capitalize(label)}
            value={currentTimes ? currentTimes[label as keyof PrayerTimes] : undefined}
            highlight={selectedDay === "today" && nextPrayer === label}
            countdown={selectedDay === "today" && nextPrayer === label ? countdown : undefined}
          />
        ))}
      </div>
    </div>
  );
}

/* ---------------- Components ---------------- */

function PrayerRow({
  label,
  value,
  highlight = false,
  countdown,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
  countdown?: string;
}) {
  return (
    <Card
      className={`flex flex-row justify-between items-center p-4 rounded-lg shadow-sm transition ${highlight
        ? "bg-yellow-100 dark:bg-yellow-700 font-semibold border-l-4 border-yellow-500 dark:border-yellow-300"
        : ""
        }`}
    >
      <div className="flex flex-col">
        <span>{label}</span>
        {highlight && countdown && (
          <span className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {countdown} lagi
          </span>
        )}
      </div>
      <span>{value ?? <Skeleton className="h-4 w-16 dark:bg-zinc-700" />}</span>
    </Card>
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
