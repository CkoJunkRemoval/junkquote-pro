import { beforeEach, describe, expect, it } from "vitest";
import { DevelopmentMemoryStore, setCoordinationStoreForTests } from "@/lib/distributed/store";
import { checkRateLimit } from "./rateLimit";

describe("distributed rate limiter", () => {
  beforeEach(() => setCoordinationStoreForTests(new DevelopmentMemoryStore()));
  it("atomically limits concurrent increments", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => checkRateLimit("same", { limit: 2, windowMs: 1000 })));
    expect(results.filter((result) => result.allowed)).toHaveLength(2);
  });
  it("separates tenant and IP keys", async () => {
    expect((await checkRateLimit("tenant:a:ip:1", { limit: 1, windowMs: 1000 })).allowed).toBe(true);
    expect((await checkRateLimit("tenant:b:ip:1", { limit: 1, windowMs: 1000 })).allowed).toBe(true);
    expect((await checkRateLimit("tenant:a:ip:2", { limit: 1, windowMs: 1000 })).allowed).toBe(true);
    expect((await checkRateLimit("tenant:a:ip:1", { limit: 1, windowMs: 1000 })).allowed).toBe(false);
  });
  it("fails closed on a store outage", async () => {
    setCoordinationStoreForTests({ incrementWindow: async () => { throw new Error("down"); } } as never);
    expect(await checkRateLimit("key", { limit: 1, windowMs: 1000 })).toMatchObject({ allowed: false, degraded: true });
  });
});
