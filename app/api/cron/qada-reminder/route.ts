import { NextRequest, NextResponse } from 'next/server';
import { adminDb, sendPushNotification } from '@/lib/fcm-admin';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const snapshot = await db.collection('fcm_tokens').where('qadaReminderEnabled', '==', true).get();
  if (snapshot.empty) return NextResponse.json({ sent: 0 });

  const tokens = snapshot.docs.map(d => d.id);

  const invalid = await sendPushNotification(
    tokens,
    'Jangan lupa solat qada hari ini',
    'Log solat qada anda sebelum hari berakhir.',
    { type: 'qada-reminder', tag: 'qada-reminder' },
  );

  if (invalid.length > 0) {
    const batch = db.batch();
    invalid.forEach(t => batch.delete(db.collection('fcm_tokens').doc(t)));
    await batch.commit();
  }

  return NextResponse.json({ sent: tokens.length });
}
