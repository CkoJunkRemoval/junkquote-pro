type Entry = { count: number; resetAt: number };
const buckets = new Map<string, Entry>();
export type RateLimitPolicy = { limit: number; windowMs: number };
export function checkRateLimit(
  key: string,
  policy: RateLimitPolicy,
  now = Date.now(),
) {
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    const next = { count: 1, resetAt: now + policy.windowMs };
    buckets.set(key, next);
    return {
      allowed: true,
      remaining: policy.limit - 1,
      resetAt: next.resetAt,
    };
  }
  current.count++;
  return {
    allowed: current.count <= policy.limit,
    remaining: Math.max(0, policy.limit - current.count),
    resetAt: current.resetAt,
  };
}
export function clearRateLimits() {
  buckets.clear();
}
export const ratePolicies = {
  signIn: { limit: 10, windowMs: 15 * 60_000 },
  signUp: { limit: 5, windowMs: 60 * 60_000 },
  portal: { limit: 5, windowMs: 60 * 60_000 },
  publicApproval: { limit: 30, windowMs: 15 * 60_000 },
  pdf: { limit: 20, windowMs: 60_000 },
  export: { limit: 10, windowMs: 60_000 },
  privateAsset: { limit: 120, windowMs: 60_000 },
  communication: { limit: 30, windowMs: 60_000 },
  backgroundRetry: { limit: 20, windowMs: 60_000 },
} as const;
