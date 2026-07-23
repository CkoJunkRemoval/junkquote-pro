import { describe, expect, it } from "vitest";
import {
  DEFAULT_ITEM_LIBRARY,
  PRICING_MARKETS,
  buildStandardItemLibrary,
  normalizePricingMarket,
  standardItemId,
} from "./defaultItems";

describe("JunkQuote Standard Library", () => {
  it("contains professionally tuned conservative defaults", () => {
    const prices = new Map(DEFAULT_ITEM_LIBRARY.map((item) => [item.name, item.basePrice]));
    expect(DEFAULT_ITEM_LIBRARY).toHaveLength(53);
    expect(prices.get("Microwave")).toBe(20);
    expect(prices.get("Refrigerator")).toBe(65);
    expect(prices.get("Sofa")).toBe(85);
    expect(prices.get("Sectional")).toBe(150);
    expect(prices.get("Queen Mattress")).toBe(40);
    expect(prices.get("Hot Tub")).toBe(350);
  });

  it("marks estimator-reviewed work instead of assigning a misleading price", () => {
    const required = DEFAULT_ITEM_LIBRARY.filter((item) => item.estimateRequired);
    expect(required.map((item) => item.name)).toEqual(expect.arrayContaining([
      "Concrete", "Dirt", "Large Brush Pile", "Whole House Cleanout", "Demolition", "Large Shed", "Large Deck",
    ]));
    expect(required.every((item) => item.basePrice === 0)).toBe(true);
  });

  it.each(Object.entries(PRICING_MARKETS))("applies the %s market multiplier once", (_, market) => {
    const result = buildStandardItemLibrary(market.multiplier);
    const refrigerator = result.find((item) => item.name === "Refrigerator");
    expect(refrigerator?.basePrice).toBe(Math.round(65 * market.multiplier * 100) / 100);
    expect(result.find((item) => item.name === "Concrete")?.basePrice).toBe(0);
  });

  it("validates markets and produces stable tenant-specific IDs", () => {
    expect(normalizePricingMarket("premium")).toBe("premium");
    expect(() => normalizePricingMarket("automatic")).toThrow("valid pricing market");
    expect(standardItemId("company-a", DEFAULT_ITEM_LIBRARY[0])).toBe("company-a:jq-standard:appliances-microwave");
  });
});
