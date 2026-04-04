import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import app from '@/firebase';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

async function registerSW(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;
  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

export async function getFCMToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (!VAPID_KEY) { console.error('[FCM] VAPID key missing'); return null; }
  try {
    const sw = await registerSW();
    if (!sw) { console.error('[FCM] Service worker registration failed'); return null; }
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey: VAPID_KEY, serviceWorkerRegistration: sw });
    if (!token) console.error('[FCM] getToken returned empty');
    return token || null;
  } catch (e) {
    console.error('[FCM] getToken error:', e);
    return null;
  }
}

export function onFCMMessage(callback: (payload: MessagePayload) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
