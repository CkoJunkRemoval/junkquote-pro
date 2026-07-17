export function retryDelayMs(attempts: number, baseMs = 1_000, maxMs = 60 * 60 * 1_000) { return Math.min(maxMs, baseMs * 2 ** Math.max(0, attempts - 1)); }
