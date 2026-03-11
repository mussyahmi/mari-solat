// Module-level flag: true when user explicitly picked a zone this session.
// Resets to false on page refresh (module reload), persists during SPA navigation.
let manualZone = false;

export function setManualZone(v: boolean) { manualZone = v; }
export function isManualZone() { return manualZone; }
