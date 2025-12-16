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

export function formatTime(time: string) {
  if (!time) return "-";

  const [hourStr, minute] = time.split(":");
  const hour = Number(hourStr);

  const period = hour >= 12 ? "PM" : "AM";
  const formattedHour = hour % 12 || 12;

  return `${formattedHour}:${minute} ${period}`;
}