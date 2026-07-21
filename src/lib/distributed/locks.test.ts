import { beforeEach, describe, expect, it, vi } from "vitest";
import { DevelopmentMemoryStore, setCoordinationStoreForTests } from "./store";
import { acquireDistributedLock } from "./locks";

describe("distributed locks", () => {
  beforeEach(() => setCoordinationStoreForTests(new DevelopmentMemoryStore()));
  it("allows only one concurrent owner", async () => {
    const [first, second] = await Promise.all([acquireDistributedLock("job", "1", 1000), acquireDistributedLock("job", "1", 1000)]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
  });
  it("does not release another owner's lock", async () => {
    const first = await acquireDistributedLock("job", "1", 1000); expect(first).not.toBeNull();
    expect(await first!.release()).toBe(true); expect(await first!.release()).toBe(false);
  });
  it("allows acquisition after stale expiry", async () => {
    vi.useFakeTimers(); expect(await acquireDistributedLock("job", "1", 1000)).not.toBeNull(); vi.advanceTimersByTime(1001); expect(await acquireDistributedLock("job", "1", 1000)).not.toBeNull(); vi.useRealTimers();
  });
});
