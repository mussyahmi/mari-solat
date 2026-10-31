import { BULAN, BULAN_HIJRI, BULAN_PENDEK, type Bahasa } from "@/lib/bahasa";

export function formatPrayerDates(gregorian: string, hijri: string, bahasa: Bahasa = "ms") {
  const g = formatGregorianDate(gregorian, bahasa);
  const h = formatHijriDate(hijri);
  return bahasa === "en" ? `${g} | ${h} AH` : `${g} Miladi | ${h} Hijri`;
}

const BULAN_API = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Tarikh API "16-Dec-2025" sebagai Date. Dihurai sendiri kerana Safari tidak
 * menerima format ini melalui `new Date(...)` dan memulangkan Invalid Date.
 */
export function tarikhApi(gregorian: string) {
  const [h, b, t] = gregorian.split("-");
  const bulan = BULAN_API.indexOf(b);
  return bulan < 0 ? new Date(gregorian) : new Date(Number(t), bulan, Number(h), 12);
}

export function formatGregorianDate(gregorian: string, bahasa: Bahasa = "ms") {
  // Gregorian: "16-Dec-2025"
  const gDate = tarikhApi(gregorian);
  // Akhiran "Miladi"/"Hijri" dahulunya dibakar ke dalam nilai, jadi ia
  // mengulang label yang berdiri betul-betul di atasnya. Label kini yang
  // menamakan kalendar; nilai hanya membawa tarikh.
  return `${gDate.getDate()} ${BULAN[bahasa][gDate.getMonth()]} ${gDate.getFullYear()}`;
}

/** Hijri: "1447-06-25". Nama bulan Hijri sama dalam kedua-dua bahasa. */
export function formatHijriDate(hijri: string) {
  const [hYear, hMonthStr, hDayStr] = hijri.split("-");
  return `${Number(hDayStr)} ${BULAN_HIJRI[Number(hMonthStr) - 1]} ${hYear}`;
}

export function formatShortDate(date: Date, bahasa: Bahasa = "ms") {
  return `${date.getDate()} ${BULAN_PENDEK[bahasa][date.getMonth()]}`;
}

export function formatTime(time: string) {
  if (!time) return "-";

  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);

  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute} ${period}`;
}

export function adjustRawTime(time: string, deltaMinutes: number) {
  const [h, m, s = "00"] = time.split(":");
  const total = ((Number(h) * 60 + Number(m) + deltaMinutes) % 1440 + 1440) % 1440;
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}:${s}`;
}