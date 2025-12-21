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
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { MapPinIcon, SearchIcon } from "lucide-react";
import QiblaCard from "@/components/QiblaCard";
import { Badge } from "@/components/ui/badge";

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
  { title: 'Waktu Jawaz', description: 'Waktu yang harus kita sembahyang. Contoh, solat Zohor pada 3.30, waktu harus bukan haram.' },
  { title: 'Waktu Karahah (waktu makruh)', description: '15 minit lagi nak masuk waktu solat lain. Pemilihan waktu ini dibenci oleh Allah SWT jika disengajakan.' },
  { title: 'Waktu Tahrim (waktu haram)', description: 'Hampir masuk waktu lain baru nak takbir. Perbuatan melambatkan waktu solat itu yang haram, namun sembahyangnya tidak haram.' },
];

export default function HomePage() {
  const [zone, setZone] = useState<string | null>(null);
  const [allTimes, setAllTimes] = useState<PrayerDataByDay>({});
  const [selectedDay, setSelectedDay] = useState<"yesterday" | "today" | "tomorrow">("today");
  const [countdownPrayer, setCountdownPrayer] = useState("");
  const [countdownWaktuCategory, setCountdownWaktuCategory] = useState("");
  const [currentPrayer, setCurrentPrayer] = useState<Prayer>({ label: null, time: null });
  const [nextPrayer, setNextPrayer] = useState<Prayer>({ label: null, time: null });
  const [currentWaktuCategory, setCurrentWaktuCategory] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [allZones, setAllZones] = useState<any[]>([]);
  const [showZoneSelector, setShowZoneSelector] = useState(false);
  const [selectedNegeri, setSelectedNegeri] = useState("");
  const [isManualMode, setIsManualMode] = useState(false);
  const [isInitialize, setIsInitialize] = useState(false);
  const [timeRangeWaktuCategory, setTimeRangeWaktuCategory] = useState<{ title: string, timeRange: string }[]>([]);

  useEffect(() => {
    requestLocation();
    fetchAllZones();
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
    if (!navigator.geolocation) {
      toast.error("Geolokasi tidak disokong oleh pelayar anda.");
      setIsManualMode(true);
      return;
    }

    const timeoutId = setTimeout(() => {
      setIsManualMode(true);
      setShowZoneSelector(true);
    }, 10000); // 10 second timeout

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        clearTimeout(timeoutId);
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

          await loadZoneData(zoneData.zone, `${zoneData.zone} · ${zoneData.district}`);
        } catch {
          toast.error("Tiada zon ditemui untuk lokasi semasa anda.");
          setIsManualMode(true);
          setShowZoneSelector(true);
        }
      },
      () => {
        clearTimeout(timeoutId);
        toast.error("Tidak dapat mengakses lokasi. Sila pilih zon secara manual.");
        setIsManualMode(true);
        setShowZoneSelector(true);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchAllZones = async () => {
    try {
      const res = await fetch("https://api.waktusolat.app/zones");
      const data = await res.json();
      setAllZones(data);
    } catch {
      toast.error("Gagal memuatkan senarai zon.");
    }
  };

  const loadZoneData = async (zoneCode: string, zoneName: string) => {
    try {
      setZone(zoneName);

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
      toast.success("Waktu solat dimuatkan.");
      setShowZoneSelector(false);
    } catch {
      toast.error("Gagal memuatkan waktu solat untuk zon ini.");
    }
  };

  const handleZoneSelect = async (zoneData: any) => {
    setCoords(null); // Clear coords in manual mode
    await loadZoneData(zoneData.jakimCode, `${zoneData.jakimCode} · ${zoneData.daerah}`);
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

      if (selectedDay == 'tomorrow') {
        t.setDate(t.getDate() + 1);
      }

      if (t > now) {
        nextLabel = p.label;
        nextTime = t;
        break;
      }

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
    setCurrentPrayer({ label: currentLabel, time: currentTime });
    updateCurrentWaktuCategory(currentLabel, currentTime!, currentLabel === 'subuh' ? parseTime(times.syuruk) : nextTime);
    setCountdownPrayer(formatCountdown(nextTime));
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
    let target = new Date(end.getTime() - karahah);

    if (elapsed <= total / 2) {
      waktuCategory = "Waktu Ikhtiar";
      target = new Date(start.getTime() + total / 2);
    }

    if (elapsed <= fadhilat) {
      waktuCategory = "Waktu Fadhilat";
      target = new Date(start.getTime() + fadhilat);
    }

    if (remaining <= karahah) {
      waktuCategory = "Waktu Karahah (waktu makruh)";
      target = new Date(end.getTime() - tahrim);
    }

    if (remaining <= tahrim) {
      waktuCategory = "Waktu Tahrim (waktu haram)";
      target = new Date(end.getTime());
    }

    setTimeRangeWaktuCategory([
      { title: "Waktu Fadhilat", timeRange: `${formatTime(new Date(start.getTime()).getHours() + ':' + String(new Date(start.getTime()).getMinutes()).padStart(2, '0'))} - ${formatTime(new Date(start.getTime() + fadhilat).getHours() + ':' + String(new Date(start.getTime() + fadhilat).getMinutes()).padStart(2, '0'))}` },
      { title: "Waktu Ikhtiar", timeRange: `${formatTime(new Date(start.getTime() + fadhilat).getHours() + ':' + String(new Date(start.getTime() + fadhilat).getMinutes()).padStart(2, '0'))} - ${formatTime(new Date(start.getTime() + total / 2).getHours() + ':' + String(new Date(start.getTime() + total / 2).getMinutes()).padStart(2, '0'))}` },
      { title: "Waktu Jawaz", timeRange: `${formatTime(new Date(start.getTime() + total / 2).getHours() + ':' + String(new Date(start.getTime() + total / 2).getMinutes()).padStart(2, '0'))} - ${formatTime(new Date(end.getTime() - karahah).getHours() + ':' + String(new Date(end.getTime() - karahah).getMinutes()).padStart(2, '0'))}` },
      { title: "Waktu Karahah (waktu makruh)", timeRange: `${formatTime(new Date(end.getTime() - karahah).getHours() + ':' + String(new Date(end.getTime() - karahah).getMinutes()).padStart(2, '0'))} - ${formatTime(new Date(end.getTime() - tahrim).getHours() + ':' + String(new Date(end.getTime() - tahrim).getMinutes()).padStart(2, '0'))}` },
      { title: "Waktu Tahrim (waktu haram)", timeRange: `${formatTime(new Date(end.getTime() - tahrim).getHours() + ':' + String(new Date(end.getTime() - tahrim).getMinutes()).padStart(2, '0'))} - ${formatTime(new Date(end.getTime()).getHours() + ':' + String(new Date(end.getTime()).getMinutes()).padStart(2, '0'))}` },
    ]);
    setCurrentWaktuCategory(currentLabel == "syuruk" ? "" : waktuCategory);
    setCountdownWaktuCategory(`${formatCountdown(target)} lagi.`);
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
          {coords && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size={"sm"}>
                  <MapPinIcon />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Koordinat Lokasi Anda</DialogTitle>
                  <DialogDescription>
                    Digunakan untuk menentukan zon waktu solat.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span>Latitud</span>
                    <span className="font-mono">{coords.lat.toFixed(6)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Longitud</span>
                    <span className="font-mono">{coords.lng.toFixed(6)}</span>
                  </div>
                </div>
                <DialogFooter>
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
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <Dialog open={showZoneSelector} onOpenChange={setShowZoneSelector}>
            <DialogTrigger asChild>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition w-full max-w-md">
                {zone ?? (isManualMode ? <Button variant="default" size="sm">Pilih Zon Waktu Solat</Button> : <Skeleton className="h-6 w-64" />)}
              </h1>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Pilih Zon Waktu Solat</DialogTitle>
                <DialogDescription>
                  Pilih negeri dahulu, kemudian pilih zon anda.
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4">
                {!selectedNegeri ? (
                  <div className="grid grid-cols-2 gap-2">
                    {Array.from(new Set(allZones.map((z) => z.negeri))).map((negeri) => (
                      <Button
                        key={negeri}
                        variant="outline"
                        onClick={() => setSelectedNegeri(negeri)}
                        className="h-auto py-3"
                      >
                        {negeri}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">{selectedNegeri}</h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedNegeri("")}
                      >
                        ← Kembali
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {allZones
                        .filter((z) => z.negeri === selectedNegeri)
                        .map((zone) => (
                          <Button
                            key={zone.jakimCode}
                            variant="outline"
                            onClick={() => handleZoneSelect(zone)}
                            className="w-full justify-start h-auto py-3 text-left"
                          >
                            <div>
                              <div className="font-semibold">{zone.jakimCode}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400 break-words whitespace-normal">
                                {zone.daerah}
                              </div>
                            </div>
                          </Button>
                        ))}
                    </div>
                  </>
                )}
              </div>
              <DialogFooter>
                <Button
                  variant="default"
                  onClick={requestLocation}
                  className="w-full justify-center"
                >
                  Guna Lokasi Semasa
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {currentTimes ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatPrayerDates(currentTimes.gregorianDate, currentTimes.hijriDate)}
          </p>
        ) : (
          <Skeleton className="h-4 w-88" />
        )}
      </div>

      <div className={`flex ${isManualMode ? "justify-center" : "justify-between"} items-center w-full max-w-md`}>
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

        {!isManualMode && (
          coords ? (
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
            <Skeleton className="h-7 w-24" />
          )
        )}
      </div>

      {/* Prayer List */}
      <div className="w-full max-w-md space-y-3">
        {["subuh", "syuruk", "zohor", "asar", "maghrib", "isyak"].map((label) => (
          <PrayerRow
            key={label}
            label={capitalize(label)}
            value={currentTimes ? currentTimes[label as keyof PrayerTimes] : undefined}
            highlight={nextPrayer.label === label}
            countdownPrayer={nextPrayer.label === label ? countdownPrayer : undefined}
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
              <CardDescription className={`${currentWaktuCategory == item.title ? "dark:text-yellow-100" : ""}`}>{item.description}</CardDescription>
            </CardHeader>
            {countdownWaktuCategory != "" && currentPrayer.label != 'syuruk' && (
              <CardContent className="flex items-center">
                <Badge variant={`${currentWaktuCategory == item.title ? "default" : "secondary"}`}>
                  {timeRangeWaktuCategory.find(t => t.title == item.title)?.timeRange ?? "--:-- - --:--"}
                </Badge>
                {currentWaktuCategory == item.title && (
                  <span className="ml-auto text-xs text-yellow-700 dark:text-yellow-300">
                    {countdownWaktuCategory}
                  </span>
                )}
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {
        coords && (
          <>
            <div className="w-full max-w-md">
              <Separator />
            </div>

            <div className="w-full max-w-md">
              <QiblaCard lat={coords.lat} lng={coords.lng} />
            </div>
          </>
        )
      }

      <div className="w-full max-w-md">
        <Separator />
      </div>

      {/* Satu Pertiga Malam Section */}
      {
        selectedDay != 'yesterday' && (
          <div className="w-full max-w-md">
            <Card className="p-4">
              <CardContent className="text-center">
                <p className="font-semibold">Satu Pertiga Malam Terakhir</p>
                <div className="text-2xl font-bold text-gray-500 dark:text-gray-400 flex items-center justify-center">
                  {allTimes.today ? lastThird.start : <Skeleton className="h-7 w-16 mx-2" />} AM - {allTimes.today ? lastThird.end : <Skeleton className="h-7 w-16 mx-2" />} AM
                </div>

                <Dialog>
                  <DialogTrigger asChild>
                    {coords && (
                      <Button variant="secondary" size="sm" className="mt-4">
                        Cara Kiraan
                      </Button>
                    )}
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
        )
      }
    </div >
  );
}

/* ---------------- Components ---------------- */
function PrayerRow({
  label,
  value,
  highlight = false,
  countdownPrayer,
}: {
  label: string;
  value?: string;
  highlight?: boolean;
  countdownPrayer?: string;
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
        {highlight && countdownPrayer && (
          <span className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
            {countdownPrayer} lagi
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
