import { coordinationStore, secureCoordinationKey } from "@/lib/distributed/store";
import { logger } from "@/lib/observability/logger";

export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult = { allowed: boolean; remaining: number; resetAt: number; retryAfterSeconds: number; degraded: boolean };
export async function checkRateLimit(key: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  try {
    const result = await coordinationStore().incrementWindow(secureCoordinationKey("rate", key), policy.windowMs);
    const allowed = result.count <= policy.limit;
    if (!allowed) logger.warn("security.rate_limit_hit", { category: key.split(":", 1)[0], windowMs: policy.windowMs });
    return { allowed, remaining: Math.max(0, policy.limit - result.count), resetAt: Date.now() + result.ttlMs, retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(result.ttlMs / 1000)), degraded: false };
  } catch {
    logger.error("security.redis_rate_limit_failure", { category: key.split(":", 1)[0] });
    // Security-sensitive traffic is blocked when distributed enforcement cannot be established.
    return { allowed: false, remaining: 0, resetAt: Date.now() + 30_000, retryAfterSeconds: 30, degraded: true };
  }
}
export function clearRateLimits() { /* compatibility: distributed counters intentionally cannot be globally cleared */ }
export const ratePolicies = {
  signIn: { limit: 10, windowMs: 15 * 60_000 }, signUp: { limit: 5, windowMs: 60 * 60_000 }, passwordReset: { limit: 5, windowMs: 60 * 60_000 }, portal: { limit: 5, windowMs: 60 * 60_000 }, publicApproval: { limit: 30, windowMs: 15 * 60_000 }, publicEstimate: { limit: 60, windowMs: 15 * 60_000 }, billing: { limit: 30, windowMs: 60_000 }, systemAdmin: { limit: 30, windowMs: 60_000 }, webhook: { limit: 120, windowMs: 60_000 }, pdf: { limit: 20, windowMs: 60_000 }, export: { limit: 10, windowMs: 60_000 }, privateAsset: { limit: 120, windowMs: 60_000 }, communication: { limit: 30, windowMs: 60_000 }, backgroundRetry: { limit: 20, windowMs: 60_000 },
} as const;
