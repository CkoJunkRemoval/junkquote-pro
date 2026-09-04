import { describe, expect, it } from "vitest";
import { LIVE_LOCATION_STALE_MS, liveLocationStatus } from "./liveLocationStatus";

describe("dispatch live location status", () => {
  const now = new Date("2026-09-04T12:00:00Z");
  it("distinguishes current, stale, and unavailable location", () => {
    expect(liveLocationStatus(new Date(now.getTime() - 60_000), now)).toBe(
      "current",
    );
    expect(
      liveLocationStatus(
        new Date(now.getTime() - LIVE_LOCATION_STALE_MS - 1),
        now,
      ),
    ).toBe("stale");
    expect(liveLocationStatus(null, now)).toBe("unavailable");
  });
});
