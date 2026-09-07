import { toast } from 'sonner';

export const AZAN_PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;

export const PRAYER_LABELS: Record<string, string> = {
  subuh: 'Subuh',
  zohor: 'Zohor',
  asar: 'Asar',
  maghrib: 'Maghrib',
  isyak: 'Isyak',
};

export function isGlobalAzanOn(): boolean {
  return localStorage.getItem('msolat_azan_on') === 'true';
}

export function setGlobalAzanOn(value: boolean): void {
  localStorage.setItem('msolat_azan_on', value ? 'true' : 'false');
}

export function isAzanEnabled(prayer: string): boolean {
  const stored = localStorage.getItem(`msolat_azan_${prayer}`);
  return stored === null ? true : stored === 'true';
}

export function setAzanEnabled(prayer: string, value: boolean): void {
  localStorage.setItem(`msolat_azan_${prayer}`, value ? 'true' : 'false');
}

export async function requestNotifPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  return Notification.requestPermission();
}

// Rujukan kepada azan yang sedang berbunyi. Tanpa ini tiada apa yang
// memegang objek Audio, jadi setelah ia bermula tiada cara untuk
// menghentikannya selain menutup tab — dan azan berbunyi beberapa minit.
let azanSemasa: HTMLAudioElement | null = null;
let idToast: string | number | null = null;

export function isAzanPlaying(): boolean {
  return azanSemasa !== null;
}

export function stopAzan(): void {
  if (azanSemasa) {
    azanSemasa.pause();
    azanSemasa.currentTime = 0;
    azanSemasa = null;
  }
  if (idToast !== null) {
    toast.dismiss(idToast);
    idToast = null;
  }
}

export function playAzan(isSubuh: boolean): void {
  stopAzan();
  try {
    const audio = new Audio(isSubuh ? '/audio/azan-subuh.mp3' : '/audio/azan-standard.mp3');
    azanSemasa = audio;
    audio.addEventListener('ended', stopAzan, { once: true });
    audio.play().catch(() => { /* main auto disekat pelayar */ });
  } catch {
    azanSemasa = null;
  }
}

export function triggerAzan(prayer: string): void {
  const label = PRAYER_LABELS[prayer] ?? prayer;
  playAzan(prayer === 'subuh');
  // Kekal sehingga ditolak: azan berbunyi lebih lama daripada mana-mana
  // toast, jadi butang berhenti mesti kekal selagi bunyinya berjalan.
  idToast = toast.info(`Waktu ${label}`, {
    description: `Sudah masuk waktu ${label}.`,
    duration: Infinity,
    action: { label: 'Berhenti', onClick: stopAzan },
  });
}
