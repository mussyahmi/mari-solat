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

export function fetchVisits(): Promise<any[]> {
  if (!SCRIPT_URL) return Promise.resolve([]);
  return new Promise((resolve) => {
    const callbackName = `__msolat_cb_${Date.now()}`;
    const script = document.createElement('script');
    (window as any)[callbackName] = (data: any) => {
      delete (window as any)[callbackName];
      document.head.removeChild(script);
      resolve(Array.isArray(data) ? data : (data.rows ?? []));
    };
    script.src = `${SCRIPT_URL}?action=read&callback=${callbackName}`;
    script.onerror = () => { document.head.removeChild(script); resolve([]); };
    document.head.appendChild(script);
  });
}
