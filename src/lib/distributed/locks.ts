import { coordinationStore, newLockOwner, secureCoordinationKey } from "./store";
import { logger } from "@/lib/observability/logger";

export type DistributedLock = { key: string; owner: string; release: () => Promise<boolean> };
export async function acquireDistributedLock(name: string, identifier: string, ttlMs: number): Promise<DistributedLock | null> {
  if (!Number.isInteger(ttlMs) || ttlMs < 1000) throw new Error("Lock TTL must be at least one second.");
  const key = secureCoordinationKey(`lock:${name}`, identifier);
  const owner = newLockOwner();
  if (!await coordinationStore().set(key, owner, ttlMs, true)) { logger.warn("coordination.lock_contention", { lock: name }); return null; }
  return { key, owner, release: () => coordinationStore().compareAndDelete(key, owner) };
}
export async function withDistributedLock<T>(name: string, identifier: string, ttlMs: number, work: () => Promise<T>) {
  const lock = await acquireDistributedLock(name, identifier, ttlMs);
  if (!lock) throw new Error("This operation is already in progress.");
  try { return await work(); } finally { await lock.release().catch(() => false); }
}
