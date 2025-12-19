"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { formatPrayerDates, formatTime } from "@/utils/format";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPin, SearchIcon } from "lucide-react";
import next from "next";

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

type WaktuCategory = {
  title: string;
  description: string;
};

const KATEGORI_SOLAT: WaktuCategory[] = [
  { title: 'Waktu Fadhilat', description: 'Waktu paling awal lepas azan paling banyak pahala.' },
  { title: 'Waktu Ikhtiar', description: '15 minit selepas azan waktu yang kita boleh pilih.' },
  { title: 'Waktu Jawaz', description: 'Waktu yang harus kita sembahyang. Contoh, solat Zuhur pada 3.30, waktu harus bukan haram.' },
  { title: 'Waktu Karahah (waktu makruh)', description: '15 minit lagi nak masuk waktu solat lain. Pemilihan waktu ini dibenci oleh Allah SWT jika disengajakan.' },
  { title: 'Waktu Tahrim (waktu haram)', description: 'Hampir masuk waktu lain baru nak takbir. Perbuatan melambatkan waktu solat itu yang haram, namun sembahyangnya tidak haram.' },
];

export default function HomePage() {
  const [zone, setZone] = useState<string | null>(null);
  const [allTimes, setAllTimes] = useState<PrayerDataByDay>({});
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [countdown, setCountdown] = useState("");
  const [currentPrayer, setCurrentPrayer] = useState<Prayer>({ label: null, time: null });
  const [nextPrayer, setNextPrayer] = useState<Prayer>({ label: null, time: null });
  const [currentWaktuCategory, setCurrentWaktuCategory] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestLocation();
  }, []);

  useEffect(() => {
    if (!allTimes.today) return;
    updateNextPrayer();
    const interval = setInterval(updateNextPrayer, 1000);
    return () => clearInterval(interval);
  }, [allTimes]);

  useEffect(() => {
    if (!allTimes.tomorrow) return;
    if (nextPrayer.label == 'subuh' && nextPrayer.time == parseTime(allTimes.tomorrow.subuh)) {
      setSelectedDay("tomorrow");
    }
  }, [nextPrayer.label]);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak disokong oleh pelayar anda.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const { latitude, longitude } = coords;

          setCoords({
            lat: latitude,
            lng: longitude,
          });

          const zoneRes = await fetch(
            `https://api.waktusolat.app/zones/${latitude}/${longitude}`
          );
          const zoneData = await zoneRes.json();
          if (!zoneRes.ok || "error" in zoneData) throw new Error();

          setZone(`${zoneData.zone} · ${zoneData.district}`);

          const days: ("yesterday" | "today" | "tomorrow")[] = [
            "yesterday",
            "today",
            "tomorrow",
          ];
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
      setNextPrayer({ label: null, time: null });
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

    let currentLabel, nextLabel: keyof PrayerTimes | null = null;
    let currentTime, nextTime: Date | null = null;

    for (const p of prayers) {
      const t = parseTime(p.time);
      if (t > now) {
        nextLabel = p.label;
        nextTime = t;
        break;
      }

      currentLabel = p.label;
      currentTime = t;
    }

    if (!nextLabel) {
      nextLabel = "subuh";
      nextTime = parseTime(allTimes.today!.subuh);
      nextTime.setDate(nextTime.getDate() + 1);

      if (selectedDay == "today") {
        setNextPrayer({ label: null, time: null });
        setCountdown("");
        return;
      }
    } else {
      if (selectedDay == "tomorrow") {
        setNextPrayer({ label: null, time: null });
        setCountdown("");
        return;
      }
    }

    setNextPrayer({ label: nextLabel, time: nextTime });
    setCurrentPrayer({ label: currentLabel!, time: currentTime! });
    updateCurrentWaktuCategory(currentLabel!, currentTime!, nextTime!);

    if (nextTime) setCountdown(formatCountdown(nextTime));
  };

  const updateCurrentWaktuCategory = (currentLabel: string, start: Date, end: Date) => {
    const now = new Date();

    const total = end.getTime() - start.getTime();
    const elapsed = now.getTime() - start.getTime();
    const remaining = end.getTime() - now.getTime();

    const fadhilat = 15 * 60 * 1000;
    const karahah = 15 * 60 * 1000;
    const tahrim = 5 * 60 * 1000;

    let waktuCategory = "Waktu Jawaz";

    if (elapsed <= fadhilat) waktuCategory = "Waktu Fadhilat";
    if (remaining <= tahrim) waktuCategory = "Waktu Tahrim";
    if (remaining <= karahah) waktuCategory = "Waktu Karahah";
    if (elapsed <= total / 2) waktuCategory = "Waktu Ikhtiar";

    setCurrentWaktuCategory(currentLabel == "syuruk" ? "" : waktuCategory)
  }

  const currentTimes = allTimes[selectedDay];

  const getLastThirdOfNight = () => {
    const todayTimes = allTimes.today;
    if (!todayTimes) return { start: "", end: "", duration: 0 };

    const maghrib = parseTime(selectedDay == 'today' ? allTimes.yesterday!.maghrib : todayTimes!.maghrib);
    let subuh = parseTime(selectedDay == 'today' ? todayTimes.subuh : allTimes.tomorrow!.subuh);
    subuh.setDate(subuh.getDate() + 1);

    let nightDuration = subuh.getTime() - maghrib.getTime();

    const thirdNight = nightDuration / 3;
    const start = new Date(subuh.getTime() - thirdNight);
    const end = subuh;

    return {
      start: `${start.getHours()}:${String(start.getMinutes()).padStart(2, "0")}`,
      end: `${end.getHours()}:${String(end.getMinutes()).padStart(2, "0")}`,
      duration: thirdNight / 60000, // in minutes
      maghrib,
      subuh,
      thirdNightMs: thirdNight,
      startDate: start,
      endDate: end,
    };
  };

  const lastThird = getLastThirdOfNight();

  return (
    <div className="min-h-screen flex flex-col items-center p-4 space-y-6">
      {/* Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <div className="flex items-center">
          <Dialog>
            <DialogTrigger asChild>
              {zone && (
                <Button variant="ghost" size={"sm"}>
                  <MapPin />
                </Button>
              )}
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Koordinat Lokasi Anda</DialogTitle>
                <DialogDescription>
                  Digunakan untuk menentukan zon waktu solat.
                </DialogDescription>
              </DialogHeader>
              {coords && (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Latitude</span>
                    <span className="font-mono">{coords.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longitude</span>
                    <span className="font-mono">{coords.lng.toFixed(6)}</span>
                  </div>
                </div>
              )}
              <DialogFooter>
                {coords && (
                  <Button
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `${coords.lat}, ${coords.lng}`
                      );
                      toast.success("Koordinat disalin");
                    }}
                  >
                    Salin Koordinat
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            {zone ?? <Skeleton className="h-6 w-64" />}
          </h1>
        </div>

        {currentTimes ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate)}
          </p>
        ) : (
          <Skeleton className="h-4 w-88" />
        )}
      </div>

      <div className="flex justify-between w-full max-w-md">
        {/* Day Selector Buttons */}
        <ButtonGroup>
          {["yesterday", "today", "tomorrow"].map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? "default" : "outline"}
              onClick={() => setSelectedDay(day as "yesterday" | "today" | "tomorrow")}
              size={"sm"}
            >
              {day === "yesterday"
                ? "Semalam"
                : day === "today"
                  ? "Hari Ini"
                  : "Esok"}
            </Button>
          ))}
        </ButtonGroup>

        {coords ? (
          <Button
            variant="link"
            size="sm"
            onClick={() => {
              window.open(`https://www.google.com/maps/search/masjid/@${coords.lat},${coords.lng},15z`, "_blank");
            }}
          >
            <SearchIcon /> Masjid
          </Button>
        ) : (
          <Skeleton className="h-6 w-40" />
        )}
      </div>

      {/* Prayer List */}
      <div className="w-full max-w-md space-y-3">
        {["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"].map((label) => (
          <PrayerRow
            key={label}
            label={capitalize(label)}
            value={currentTimes ? currentTimes[label as keyof PrayerTimes] : undefined}
            highlight={selectedDay === "today" && nextPrayer.label === label}
            countdown={selectedDay === "today" && nextPrayer.label === label ? countdown : undefined}
          />
        ))}
      </div>

      <div className="w-full max-w-md">
        <Separator />
      </div>

      {/* Waktu Category */}
      <div className="w-full max-w-md text-sm text-gray-600 dark:text-gray-300 text-center">
        {currentPrayer.label && currentPrayer.label != 'syuruk' ? (
          <>
            Anda kini berada dalam waktu solat:
            <div className="font-semibold flex justify-center items-center">
              {capitalize(currentPrayer.label)}
            </div>
            Kategori waktu sekarang adalah seperti di bawah.
          </>
        ) : (
          <>Berikut ialah 5 kategori waktu solat.</>
        )}
      </div>

      <div className="w-full max-w-md space-y-3">
        {KATEGORI_SOLAT.map((item) => (
          <Card key={item.title} className={`transition ${currentWaktuCategory == item.title
            ? "bg-yellow-100 dark:bg-yellow-700 font-semibold border-l-4 border-yellow-500 dark:border-yellow-300"
            : ""
            }`}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <CardDescription className={`${currentWaktuCategory == item.title ? "text-yellow-700 dark:text-yellow-300" : ""}`}>{item.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="w-full max-w-md">
        <Separator />
      </div>

      {/* Satu Pertiga Malam Section */}
      {selectedDay != 'yesterday' && (
        <div className="w-full max-w-md">
          <Card className="p-4">
            <CardContent className="text-center">
              <p className="font-semibold">Satu Pertiga Malam Terakhir</p>
              <div className="text-2xl font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center">
                {allTimes.today ? lastThird.start : <Skeleton className="h-7 w-16 mx-2" />} AM - {allTimes.today ? lastThird.end : <Skeleton className="h-7 w-16 mx-2" />} AM
              </div>

              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="secondary" size="sm" className="mt-4">
                    Cara Kiraan
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cara Kiraan Satu Pertiga Malam Terakhir</DialogTitle>
                  </DialogHeader>
                  {allTimes.today && (
                    <ol className="list-decimal list-inside space-y-2 text-sm marker:font-bold">
                      <li>
                        <strong>Kenal pasti masa Maghrib ({selectedDay == 'today' ? 'Semalam' : 'Hari Ini'}) dan Subuh ({selectedDay == 'today' ? 'Hari Ini' : 'Esok'}):</strong>
                        <br />
                        Maghrib {allTimes.today?.maghrib} dan Subuh {allTimes.today?.subuh}.
                      </li>
                      <li>
                        <strong>Kira tempoh malam:</strong>
                        <br />
                        Subuh - Maghrib = {(lastThird.subuh!.getTime() - lastThird.maghrib!.getTime()) / 60000} minit (~{Math.floor((lastThird.subuh!.getTime() - lastThird.maghrib!.getTime()) / 60 / 60000)} jam {Math.floor(((lastThird.subuh!.getTime() - lastThird.maghrib!.getTime()) / 60000) % 60)} minit).
                      </li>
                      <li>
                        <strong>Bahagikan malam kepada 3 bahagian sama rata:</strong>
                        <br />
                        {(lastThird.thirdNightMs! / 60000).toFixed(0)} minit (~{Math.floor((lastThird.thirdNightMs! / 60000) / 60)} jam {Math.floor((lastThird.thirdNightMs! / 60000) % 60)} minit) setiap bahagian.
                      </li>
                      <li>
                        <strong>Satu pertiga malam yang terakhir:</strong>
                        <br />
                        Tolak tempoh 1/3 malam dari Subuh: 6:02 AM - {(lastThird.thirdNightMs! / 60000).toFixed(0)} minit (~{Math.floor((lastThird.thirdNightMs! / 60000) / 60)} jam {Math.floor((lastThird.thirdNightMs! / 60000) % 60)} minit) ≈ {lastThird.start} AM.
                      </li>
                      <li>
                        <strong>Formula ringkas:</strong>
                        <br />
                        (Subuh - Maghrib) ÷ 3 = tempoh 1/3 malam
                        <br />
                        1/3 malam terakhir = Subuh - tempoh 1/3 malam
                      </li>
                    </ol>
                  )}
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>
      )}
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
      className={`flex flex-row justify-between items-center p-4 transition ${highlight
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
      <span>{value ?? <Skeleton className="h-5 w-16 dark:bg-zinc-700" />}</span>
    </Card>
  );
}

/* ---------------- Helpers ---------------- */
async function fetchSolat(zone: string, date: Date) {
  const res = await fetch(
    `https://api.waktusolat.app/solat/${zone}/${date.getDate()}?year=${date.getFullYear()}&month=${date.getMonth() + 1
    }`
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
