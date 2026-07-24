import { describe, expect, it } from "vitest";
import { nextAllowedDelivery } from "./quietHours";
describe("communication quiet hours", () => {
  it("defers non-urgent messages until quiet hours end", () => {
    const result = nextAllowedDelivery({ now: new Date("2026-08-10T06:00:00Z"), timeZone: "UTC", quietHoursStart: "22:00", quietHoursEnd: "08:00" });
    expect(result.delayed).toBe(true);
    expect(result.scheduledFor.toISOString()).toBe("2026-08-10T08:00:00.000Z");
  });
  it("allows urgent operational messages immediately", () => expect(nextAllowedDelivery({ now: new Date(), timeZone: "UTC", quietHoursStart: "00:00", quietHoursEnd: "23:59", urgent: true }).delayed).toBe(false));
});
