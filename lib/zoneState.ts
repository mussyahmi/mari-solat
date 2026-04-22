// Module-level flag: true when user explicitly picked a zone this session.
// Resets to false on page refresh (module reload), persists during SPA navigation.
let manualZone = false;

const MANUAL_ZONE_KEY = 'msolat_manual_zone_until';
const MANUAL_ZONE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export function setManualZone(v: boolean) {
  manualZone = v;
  if (typeof window !== 'undefined') {
    if (v) {
      localStorage.setItem(MANUAL_ZONE_KEY, String(Date.now() + MANUAL_ZONE_DURATION_MS));
    } else {
      localStorage.removeItem(MANUAL_ZONE_KEY);
    }
  }
}

export function isManualZone() {
  if (manualZone) return true;
  if (typeof window === 'undefined') return false;
  const until = Number(localStorage.getItem(MANUAL_ZONE_KEY) ?? 0);
  return until > Date.now();
}
