import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import app from '@/firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const existing = await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if (existing) return existing;
    return await navigator.serviceWorker.register('/firebase-messaging-sw.js');
  } catch {
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!VAPID_KEY) return null;
  try {
    const sw = await registerSW();
    if (!sw) return null;
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
    return token || null;
  } catch {
    return null;
  }
}

export function onFCMMessage(callback: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
