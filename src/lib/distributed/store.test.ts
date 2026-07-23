import { describe, expect, it, vi } from "vitest";
import { createCoordinationStore, DevelopmentMemoryStore } from "./store";

describe("coordination store", () => {
  it("uses a production fallback when Redis is disabled", async () =>
    expect(
      (
        await createCoordinationStore({
          NODE_ENV: "production",
        } as NodeJS.ProcessEnv).health()
      ).mode,
    ).toBe("memory"));
  it("uses a development fallback", async () =>
    expect(
      (
        await createCoordinationStore({
          NODE_ENV: "development",
        } as NodeJS.ProcessEnv).health()
      ).mode,
    ).toBe("memory"));
  it("degrades safely when a Redis URL does not use TLS", async () =>
    expect(
      (
        await createCoordinationStore({
          NODE_ENV: "production",
          KV_REST_API_URL: "http://redis",
          KV_REST_API_TOKEN: "token",
        } as NodeJS.ProcessEnv).health()
      ).mode,
    ).toBe("memory"));
  it("expires development entries", async () => {
    vi.useFakeTimers();
    const store = new DevelopmentMemoryStore();
    await store.set("x", "1", 1000);
    vi.advanceTimersByTime(1001);
    expect(await store.get("x")).toBeNull();
    vi.useRealTimers();
  });
});
