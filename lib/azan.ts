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

export function playAzan(isSubuh: boolean): void {
  try {
    const audio = new Audio(isSubuh ? '/audio/azan-subuh.mp3' : '/audio/azan-standard.mp3');
    audio.play().catch(() => { /* autoplay blocked */ });
  } catch { /* silent */ }
}

export function showAzanNotification(prayer: string): void {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  const label = PRAYER_LABELS[prayer] ?? prayer;
  new Notification(`Waktu ${label}`, {
    body: `Sudah masuk waktu ${label}.`,
    icon: '/icons/icon-192.png',
  });
}

export function triggerAzan(prayer: string): void {
  const label = PRAYER_LABELS[prayer] ?? prayer;
  playAzan(prayer === 'subuh');
  showAzanNotification(prayer);
  toast.info(`Waktu ${label}`, { description: `Sudah masuk waktu ${label}.`, duration: 10000 });
}
