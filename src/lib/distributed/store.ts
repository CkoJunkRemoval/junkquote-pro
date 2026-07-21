import { createHash, randomUUID } from "node:crypto";

export type WindowResult = { count: number; ttlMs: number };
export type DistributedHealth = { ok: boolean; mode: "redis" | "memory" | "unavailable"; latencyMs: number };
export interface CoordinationStore {
  incrementWindow(key: string, windowMs: number): Promise<WindowResult>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs: number, onlyIfAbsent?: boolean): Promise<boolean>;
  delete(key: string): Promise<void>;
  compareAndDelete(key: string, value: string): Promise<boolean>;
  health(): Promise<DistributedHealth>;
}

export class DistributedStoreUnavailableError extends Error {
  constructor() { super("Distributed security controls are unavailable."); this.name = "DistributedStoreUnavailableError"; }
}

const keyHash = (value: string) => createHash("sha256").update(value).digest("hex");
export const secureCoordinationKey = (namespace: string, identifier: string) => `jqp:${namespace}:${keyHash(identifier)}`;

class UpstashRestStore implements CoordinationStore {
  constructor(private readonly url: string, private readonly token: string) {}
  private async command<T>(command: unknown[]): Promise<T> {
    const response = await fetch(this.url, { method: "POST", headers: { authorization: `Bearer ${this.token}`, "content-type": "application/json" }, body: JSON.stringify(command), cache: "no-store", signal: AbortSignal.timeout(3000) });
    if (!response.ok) throw new DistributedStoreUnavailableError();
    const body = await response.json() as { result?: T; error?: string };
    if (body.error) throw new DistributedStoreUnavailableError();
    return body.result as T;
  }
  async incrementWindow(key: string, windowMs: number) {
    const result = await this.command<[number, number]>(["EVAL", "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {n,redis.call('PTTL',KEYS[1])}", "1", key, String(windowMs)]);
    return { count: Number(result[0]), ttlMs: Math.max(0, Number(result[1])) };
  }
  get(key: string) { return this.command<string | null>(["GET", key]); }
  async set(key: string, value: string, ttlMs: number, onlyIfAbsent = false) {
    const result = await this.command<string | null>(["SET", key, value, "PX", String(ttlMs), ...(onlyIfAbsent ? ["NX"] : [])]);
    return result === "OK";
  }
  async delete(key: string) { await this.command<number>(["DEL", key]); }
  async compareAndDelete(key: string, value: string) {
    return Number(await this.command<number>(["EVAL", "if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]) else return 0 end", "1", key, value])) === 1;
  }
  async health() { const started = Date.now(); try { await this.command<string>(["PING"]); return { ok: true, mode: "redis" as const, latencyMs: Date.now() - started }; } catch { return { ok: false, mode: "unavailable" as const, latencyMs: Date.now() - started }; } }
}

type MemoryEntry = { value: string; expiresAt: number };
export class DevelopmentMemoryStore implements CoordinationStore {
  private entries = new Map<string, MemoryEntry>();
  private current(key: string) { const item = this.entries.get(key); if (item && item.expiresAt <= Date.now()) { this.entries.delete(key); return undefined; } return item; }
  async incrementWindow(key: string, windowMs: number) { const item = this.current(key); const next = item ? Number(item.value) + 1 : 1; const expiresAt = item?.expiresAt ?? Date.now() + windowMs; this.entries.set(key, { value: String(next), expiresAt }); return { count: next, ttlMs: Math.max(0, expiresAt - Date.now()) }; }
  async get(key: string) { return this.current(key)?.value ?? null; }
  async set(key: string, value: string, ttlMs: number, onlyIfAbsent = false) { if (onlyIfAbsent && this.current(key)) return false; this.entries.set(key, { value, expiresAt: Date.now() + ttlMs }); return true; }
  async delete(key: string) { this.entries.delete(key); }
  async compareAndDelete(key: string, value: string) { if (this.current(key)?.value !== value) return false; this.entries.delete(key); return true; }
  async health() { return { ok: true, mode: "memory" as const, latencyMs: 0 }; }
  clear() { this.entries.clear(); }
}

let singleton: CoordinationStore | undefined;
export function createCoordinationStore(env: NodeJS.ProcessEnv = process.env): CoordinationStore {
  const url = env.KV_REST_API_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
  const token = env.KV_REST_API_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) {
    if (!url.startsWith("https://")) throw new Error("Distributed Redis must use HTTPS/TLS.");
    return new UpstashRestStore(url.replace(/\/$/, ""), token);
  }
  if (env.NODE_ENV === "production") throw new Error("Distributed Redis configuration is required in production.");
  if (env.NODE_ENV !== "test") console.warn("[coordination] using development-only in-memory fallback");
  return new DevelopmentMemoryStore();
}
export function coordinationStore() { return singleton ??= createCoordinationStore(); }
export function setCoordinationStoreForTests(store?: CoordinationStore) { singleton = store; }
export const newLockOwner = () => randomUUID();
