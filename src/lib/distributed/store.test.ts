import { describe, expect, it, vi } from "vitest";
import { createCoordinationStore, DevelopmentMemoryStore } from "./store";

describe("coordination store", () => {
  it("refuses production fallback", () => expect(() => createCoordinationStore({ NODE_ENV: "production" } as NodeJS.ProcessEnv)).toThrow("required in production"));
  it("uses a development fallback", async () => expect((await createCoordinationStore({ NODE_ENV: "development" } as NodeJS.ProcessEnv).health()).mode).toBe("memory"));
  it("requires TLS", () => expect(() => createCoordinationStore({ NODE_ENV: "production", KV_REST_API_URL: "http://redis", KV_REST_API_TOKEN: "token" } as NodeJS.ProcessEnv)).toThrow("HTTPS"));
  it("expires development entries", async () => {
    vi.useFakeTimers(); const store = new DevelopmentMemoryStore(); await store.set("x", "1", 1000); vi.advanceTimersByTime(1001); expect(await store.get("x")).toBeNull(); vi.useRealTimers();
  });
});
