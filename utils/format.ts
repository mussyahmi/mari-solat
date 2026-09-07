const gregorianMonthsBM = [
  "Januari", "Februari", "Mac", "April", "Mei", "Jun",
  "Julai", "Ogos", "September", "Oktober", "November", "Disember"
];

const hijriMonthsBM = [
  "Muharram", "Safar", "Rabiulawal", "Rabiulakhir", "Jamadilawal", "Jamadilakhir",
  "Rejab", "Syaaban", "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah"
];


export function formatPrayerDates(gregorian: string, hijri: string) {
  // Gregorian: "16-Dec-2025"
  const gDate = new Date(gregorian);
  const gDay = gDate.getDate();
  const gMonth = gregorianMonthsBM[gDate.getMonth()];
  const gYear = gDate.getFullYear();

  // Hijri: "1447-06-25"
  const [hYear, hMonthStr, hDayStr] = hijri.split("-");
  const hMonth = hijriMonthsBM[Number(hMonthStr) - 1];
  const hDay = Number(hDayStr);

  return `${gDay} ${gMonth} ${gYear} Miladi | ${hDay} ${hMonth} ${hYear} Hijri`;
}

export function formatGregorianDate(gregorian: string) {
  const gDate = new Date(gregorian);
  const gDay = gDate.getDate();
  const gMonth = gregorianMonthsBM[gDate.getMonth()];
  const gYear = gDate.getFullYear();
  // Akhiran "Miladi"/"Hijri" dahulunya dibakar ke dalam nilai, jadi ia
  // mengulang label yang berdiri betul-betul di atasnya. Label kini yang
  // menamakan kalendar; nilai hanya membawa tarikh.
  return `${gDay} ${gMonth} ${gYear}`;
}

export function formatHijriDate(hijri: string) {
  const [hYear, hMonthStr, hDayStr] = hijri.split("-");
  const hMonth = hijriMonthsBM[Number(hMonthStr) - 1];
  const hDay = Number(hDayStr);
  return `${hDay} ${hMonth} ${hYear}`;
}

const shortMonthsBM = ["Jan","Feb","Mac","Apr","Mei","Jun","Jul","Ogs","Sep","Okt","Nov","Dis"];

export function formatShortDate(date: Date) {
  return `${date.getDate()} ${shortMonthsBM[date.getMonth()]}`;
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