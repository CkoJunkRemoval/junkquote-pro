import { describe, expect, it } from "vitest";
import { overlaps, parseBusinessHours, validateScheduleWindow } from "./conflicts";

const date = (hour: number) => new Date(2026, 0, 5, hour);
describe("dispatch scheduling conflicts", () => {
  it("rejects invalid job and arrival windows", () => {
    const result = validateScheduleWindow({ start: date(10), end: date(9), arrivalStart: date(11), arrivalEnd: date(10), employeeIds: ["e"], vehicleIds: ["v"], requiredCrewSize: 1 });
    expect(result.map((item) => item.code)).toEqual(expect.arrayContaining(["INVALID_TIME", "INVALID_ARRIVAL_WINDOW"]));
  });
  it("warns about missing resources, short crews, and business hours", () => {
    const result = validateScheduleWindow({ start: date(7), end: date(18), employeeIds: [], vehicleIds: [], requiredCrewSize: 2, businessHours: { startMinutes: 480, endMinutes: 1020 } });
    expect(result.filter((item) => item.severity === "warning")).toHaveLength(4);
  });
  it("uses half-open overlap windows", () => {
    expect(overlaps(date(9), date(10), date(10), date(11))).toBe(false);
    expect(overlaps(date(9), date(10), date(9), date(11))).toBe(true);
    expect(parseBusinessHours("08:30-17:00")).toEqual({ startMinutes: 510, endMinutes: 1020 });
  });
});
