import { describe, expect, it } from "vitest";
import {
  csvCell,
  deriveSessionMinutes,
  payPeriodRange,
  splitRegularOvertime,
  workweekStart,
} from "./calculations";

const point = (
  eventType: "ClockIn" | "ClockOut" | "BreakStart" | "BreakEnd",
  value: string,
) => ({ eventType, eventTimestamp: new Date(value) });

describe("timekeeping calculations", () => {
  it("derives payable time and unpaid breaks from raw events", () => {
    expect(
      deriveSessionMinutes([
        point("ClockIn", "2026-08-03T13:00:00Z"),
        point("BreakStart", "2026-08-03T17:00:00Z"),
        point("BreakEnd", "2026-08-03T17:30:00Z"),
        point("ClockOut", "2026-08-03T21:00:00Z"),
      ]),
    ).toMatchObject({
      grossMinutes: 480,
      unpaidBreakMinutes: 30,
      payableMinutes: 450,
      openBreak: false,
    });
  });

  it("handles overnight sessions from absolute timestamps", () => {
    expect(
      deriveSessionMinutes([
        point("ClockIn", "2026-08-03T22:00:00-04:00"),
        point("ClockOut", "2026-08-04T06:00:00-04:00"),
      ]).payableMinutes,
    ).toBe(480);
  });

  it("is DST-safe because stored instants remain authoritative", () => {
    expect(
      deriveSessionMinutes([
        point("ClockIn", "2026-11-01T01:30:00-04:00"),
        point("ClockOut", "2026-11-01T01:30:00-05:00"),
      ]).grossMinutes,
    ).toBe(60);
  });

  it("ignores voided raw events", () => {
    const voided = {
      ...point("BreakStart", "2026-08-03T14:00:00Z"),
      voidedAt: new Date(),
    };
    expect(
      deriveSessionMinutes([
        point("ClockIn", "2026-08-03T13:00:00Z"),
        voided,
        point("ClockOut", "2026-08-03T15:00:00Z"),
      ]).payableMinutes,
    ).toBe(120);
  });

  it("rejects negative or incomplete sessions", () => {
    expect(() =>
      deriveSessionMinutes([
        point("ClockIn", "2026-08-03T15:00:00Z"),
        point("ClockOut", "2026-08-03T14:00:00Z"),
      ]),
    ).toThrow("valid clock-in");
  });

  it("splits regular and overtime minutes at the configured threshold", () => {
    expect(splitRegularOvertime(180, 2340)).toEqual({
      regularMinutes: 60,
      overtimeMinutes: 120,
    });
    expect(splitRegularOvertime(60, 2400)).toEqual({
      regularMinutes: 0,
      overtimeMinutes: 60,
    });
  });

  it("resets overtime summaries at the configured workweek boundary", () => {
    expect(
      workweekStart(new Date("2026-08-05T15:00:00Z"), 1).toISOString(),
    ).toBe("2026-08-03T00:00:00.000Z");
  });

  it("generates inclusive weekly and biweekly boundaries", () => {
    const anchor = new Date("2026-08-05T15:00:00Z");
    const weekly = payPeriodRange("Weekly", anchor);
    const biweekly = payPeriodRange("Biweekly", anchor);
    expect(weekly.startDate.toISOString()).toBe("2026-08-02T00:00:00.000Z");
    expect(weekly.endDate.toISOString()).toBe("2026-08-08T23:59:59.999Z");
    expect(biweekly.endDate.toISOString()).toBe("2026-08-15T23:59:59.999Z");
  });

  it("generates semimonthly and monthly boundaries", () => {
    expect(
      payPeriodRange("Semimonthly", new Date("2026-02-20T00:00:00Z")).endDate.toISOString(),
    ).toBe("2026-02-28T23:59:59.999Z");
    expect(
      payPeriodRange("Monthly", new Date("2026-02-10T00:00:00Z")).startDate.toISOString(),
    ).toBe("2026-02-01T00:00:00.000Z");
  });

  it("escapes spreadsheet CSV values deterministically", () => {
    expect(csvCell('Rivera, "Jordan"\n=1+1')).toBe(
      '"Rivera, ""Jordan"" =1+1"',
    );
  });
});
