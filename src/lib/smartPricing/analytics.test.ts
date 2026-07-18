import { describe, expect, it } from "vitest";
import { classifyPriceVariance } from "./variance";
describe("price variance classification", () => {
  it("highlights bid and profit conditions", () => { expect(classifyPriceVariance(100, 120, 120, 60)).toEqual(["underbid", "high-profit"]); expect(classifyPriceVariance(100, 80, 80, 5)).toEqual(["overbid", "low-profit"]); });
  it("marks ordinary profitable work on target", () => { expect(classifyPriceVariance(100, 100, 100, 25)).toEqual(["on-target"]); });
});
