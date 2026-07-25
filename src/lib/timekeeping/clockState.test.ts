import { describe, expect, it } from "vitest";
import { reduceClockState } from "./calculations";

describe("clock event lifecycle", () => {
  it("allows only clock in while off the clock", () => {
    expect(reduceClockState([])).toEqual({
      clockedIn: false,
      onBreak: false,
      nextEvents: ["ClockIn"],
    });
  });

  it("moves deterministically through work and break states", () => {
    expect(reduceClockState([{ eventType: "ClockIn" }])).toMatchObject({
      clockedIn: true,
      onBreak: false,
      nextEvents: ["BreakStart", "ClockOut"],
    });
    expect(
      reduceClockState([
        { eventType: "ClockIn" },
        { eventType: "BreakStart" },
      ]),
    ).toMatchObject({ onBreak: true, nextEvents: ["BreakEnd"] });
  });

  it("preserves corrected history by excluding voided originals", () => {
    expect(
      reduceClockState([
        { eventType: "ClockIn" },
        { eventType: "ClockOut", voidedAt: new Date() },
      ]),
    ).toMatchObject({ clockedIn: true });
  });
});
