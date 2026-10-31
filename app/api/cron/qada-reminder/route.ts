import { NextRequest, NextResponse } from 'next/server';
import { adminDb, sendPushNotification } from '@/lib/fcm-admin';
import { TEKS_NOTIFIKASI } from '@/lib/bahasa';

const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = adminDb();
  const snapshot = await db.collection('fcm_tokens').where('qadaReminderEnabled', '==', true).get();
  if (snapshot.empty) return NextResponse.json({ sent: 0 });

  let sent = 0;
  for (const bahasa of ['ms', 'en'] as const) {
    // Token lama tiada medan bahasa — ia didaftarkan ketika aplikasi BM sahaja.
    const tokens = snapshot.docs
      .filter(d => (d.data().bahasa === 'en' ? 'en' : 'ms') === bahasa)
      .map(d => d.id);
    if (tokens.length === 0) continue;
    const t = TEKS_NOTIFIKASI[bahasa];

    const invalid = await sendPushNotification(
      tokens,
      t.qadaTajuk,
      t.qadaBadan,
      { type: 'qada-reminder', tag: 'qada-reminder' },
    );

    if (invalid.length > 0) {
      const batch = db.batch();
      invalid.forEach(tk => batch.delete(db.collection('fcm_tokens').doc(tk)));
      await batch.commit();
    }
    sent += tokens.length;
  }

  return NextResponse.json({ sent });
}
