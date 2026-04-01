import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0];
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, 'base64').toString());
    return initializeApp({ credential: cert(sa) });
  }
  return initializeApp(); // Application Default Credentials (Firebase Hosting / Cloud Functions)
}

export function adminDb() {
  return getFirestore(getAdminApp());
}

export async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string[]> {
  if (tokens.length === 0) return [];
  const messaging = getMessaging(getAdminApp());
  const invalidTokens: string[] = [];

  for (let i = 0; i < tokens.length; i += 500) {
    const batch = tokens.slice(i, i + 500);
    const response = await messaging.sendEachForMulticast({
      tokens: batch,
      notification: { title, body },
      data: data ?? {},
      webpush: {
        notification: { icon: '/logo-icon.png', badge: '/logo-icon.png' },
      },
    });
    response.responses.forEach((r, idx) => {
      if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
        invalidTokens.push(batch[idx]);
      }
    });
  }

  return invalidTokens;
}
