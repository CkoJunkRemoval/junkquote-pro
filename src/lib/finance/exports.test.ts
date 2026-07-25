import { describe, expect, it } from "vitest";
import { createCsv, escapeCsv } from "./exports";

describe("finance CSV", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsv('Dump, "North"\nGate')).toBe(
      '"Dump, ""North""\nGate"',
    );
  });

  it("uses deterministic requested column order", () => {
    expect(
      createCsv(["date", "amount", "description"], [
        { description: "Fuel", amount: 1250, date: "2026-07-25" },
      ]),
    ).toBe(
      "date,amount,description\r\n2026-07-25,1250,Fuel",
    );
  });
});
