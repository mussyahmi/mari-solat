import { NextRequest, NextResponse } from 'next/server';
import { adminDb, sendPushNotification } from '@/lib/fcm-admin';

const CRON_SECRET = process.env.CRON_SECRET;
const AZAN_PRAYERS = ['subuh', 'zohor', 'asar', 'maghrib', 'isyak'] as const;
const PRAYER_LABELS: Record<string, string> = {
  subuh: 'Subuh', zohor: 'Zohor', asar: 'Asar', maghrib: 'Maghrib', isyak: 'Isyak',
};

function getMYT() {
  const now = new Date();
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return {
    hhmm: `${String(myt.getUTCHours()).padStart(2, '0')}:${String(myt.getUTCMinutes()).padStart(2, '0')}`,
    day: myt.getUTCDate(),
    month: myt.getUTCMonth() + 1,
    year: myt.getUTCFullYear(),
  };
}

export async function GET(req: NextRequest) {
  if (CRON_SECRET && req.headers.get('authorization') !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { hhmm, day, month, year } = getMYT();
  const db = adminDb();

  const snapshot = await db.collection('fcm_tokens').where('azanEnabled', '==', true).get();
  if (snapshot.empty) return NextResponse.json({ sent: 0, time: hhmm });

  // Group by zone
  const zoneMap: Record<string, { token: string; prayers: string[] }[]> = {};
  snapshot.forEach(doc => {
    const d = doc.data();
    if (!d.zone) return;
    if (!zoneMap[d.zone]) zoneMap[d.zone] = [];
    zoneMap[d.zone].push({ token: doc.id, prayers: d.azanPrayers ?? [...AZAN_PRAYERS] });
  });

  let totalSent = 0;

  for (const [zone, subscribers] of Object.entries(zoneMap)) {
    try {
      const res = await fetch(`https://api.waktusolat.app/solat/${zone}/${day}?year=${year}&month=${month}`);
      if (!res.ok) continue;
      const times = await res.json();

      for (const prayer of AZAN_PRAYERS) {
        if (times[prayer] !== hhmm) continue;

        const targets = subscribers.filter(s => s.prayers.includes(prayer)).map(s => s.token);
        if (targets.length === 0) continue;

        const invalid = await sendPushNotification(
          targets,
          `Waktu ${PRAYER_LABELS[prayer]}`,
          `Sudah masuk waktu ${PRAYER_LABELS[prayer]}.`,
          { type: 'azan', prayer, tag: `azan-${prayer}` },
        );

        // Remove stale tokens
        if (invalid.length > 0) {
          const batch = db.batch();
          invalid.forEach(t => batch.delete(db.collection('fcm_tokens').doc(t)));
          await batch.commit();
        }

        totalSent += targets.length;
      }
    } catch {
      // Continue with other zones
    }
  }

  return NextResponse.json({ sent: totalSent, time: hhmm });
}
