import { coordinationStore, secureCoordinationKey } from "@/lib/distributed/store";

const attemptWindowMs = 30 * 60_000;
export type LoginLockState = { locked: boolean; retryAfterSeconds: number; attempts: number };
const normalized = (email: string) => email.trim().toLowerCase();
const attemptsKey = (email: string) => secureCoordinationKey("login-attempts", normalized(email));
const lockKey = (email: string) => secureCoordinationKey("login-lock", normalized(email));

export async function getLoginLockout(email: string): Promise<LoginLockState> {
  const raw = await coordinationStore().get(lockKey(email));
  if (!raw) return { locked: false, retryAfterSeconds: 0, attempts: 0 };
  const until = Number(raw);
  const retryAfterSeconds = Math.max(0, Math.ceil((until - Date.now()) / 1000));
  if (retryAfterSeconds <= 0) { await coordinationStore().delete(lockKey(email)); return { locked: false, retryAfterSeconds: 0, attempts: 0 }; }
  return { locked: true, retryAfterSeconds, attempts: 0 };
}

export async function recordFailedLogin(email: string): Promise<LoginLockState> {
  const result = await coordinationStore().incrementWindow(attemptsKey(email), attemptWindowMs);
  const durationMs = result.count >= 10 ? 30 * 60_000 : result.count >= 7 ? 10 * 60_000 : result.count >= 5 ? 2 * 60_000 : 0;
  if (!durationMs) return { locked: false, retryAfterSeconds: 0, attempts: result.count };
  const until = Date.now() + durationMs;
  await coordinationStore().set(lockKey(email), String(until), durationMs);
  return { locked: true, retryAfterSeconds: Math.ceil(durationMs / 1000), attempts: result.count };
}

export async function resetLoginLockout(email: string) {
  await Promise.all([coordinationStore().delete(attemptsKey(email)), coordinationStore().delete(lockKey(email))]);
}
