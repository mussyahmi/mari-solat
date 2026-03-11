const SCRIPT_URL = process.env.NEXT_PUBLIC_ANALYTICS_URL ?? '';

function getOrCreateUUID(): string {
  let uid = localStorage.getItem('msolat_uid');
  if (!uid) {
    uid = crypto.randomUUID();
    localStorage.setItem('msolat_uid', uid);
  }
  return uid;
}

export async function trackVisit(lat: number, lng: number, zone: string) {
  if (!SCRIPT_URL) return;
  const lastLat = localStorage.getItem('msolat_last_tracked_lat');
  const lastLng = localStorage.getItem('msolat_last_tracked_lng');
  if (lastLat === String(lat) && lastLng === String(lng)) return;
  try {
    const uid = getOrCreateUUID();
    await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({
        uuid: uid,
        lat,
        lng,
        zone,
        timestamp: new Date().toISOString(),
        ua: navigator.userAgent,
      }),
    });
    localStorage.setItem('msolat_last_tracked_lat', String(lat));
    localStorage.setItem('msolat_last_tracked_lng', String(lng));
  } catch { /* silent */ }
}

export async function fetchVisits(): Promise<any[]> {
  if (!SCRIPT_URL) return [];
  const res = await fetch(`${SCRIPT_URL}?action=read`);
  const data = await res.json();
  return data.rows ?? [];
}
