export const LIVE_LOCATION_STALE_MS = 10 * 60 * 1000;

export function liveLocationStatus(updatedAt: Date | null, now = new Date()) {
  if (!updatedAt) return "unavailable" as const;
  return now.getTime() - updatedAt.getTime() > LIVE_LOCATION_STALE_MS
    ? ("stale" as const)
    : ("current" as const);
}
