import { db } from '@/firebase';
import { collection, doc, setDoc, getDocs, orderBy, query, Timestamp } from 'firebase/firestore';

function getOrCreateUUID(): string {
  let uid = localStorage.getItem('msolat_uid');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('msolat_uid', uid);
  }
  return uid;
}

export async function trackVisit(lat: number, lng: number, zone: string) {
  const lastLat = localStorage.getItem('msolat_last_tracked_lat');
  const lastLng = localStorage.getItem('msolat_last_tracked_lng');
  if (lastLat === String(lat) && lastLng === String(lng)) return;
  try {
    const uuid = getOrCreateUUID();
    await setDoc(doc(db, 'visits', uuid), {
      uuid,
      lat,
      lng,
      zone,
      timestamp: Timestamp.now(),
      ua: navigator.userAgent,
    });
    localStorage.setItem('msolat_last_tracked_lat', String(lat));
    localStorage.setItem('msolat_last_tracked_lng', String(lng));
  } catch { /* silent */ }
}

export async function fetchVisits(): Promise<any[]> {
  try {
    const snap = await getDocs(query(collection(db, 'visits'), orderBy('timestamp', 'desc')));
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        timestamp: (data.timestamp as Timestamp).toDate().toISOString(),
      };
    });
  } catch {
    return [];
  }
}
