import { describe, expect, it } from "vitest";
import { calculateConfidence, median, recommendPrice, type PricingObservation } from "./engine";
const row = (price: number, days = 0): PricingObservation => ({ finalQuotedPrice: price, quantity: 1, laborHours: 2, disposalCost: 60, createdAt: new Date(Date.now() - days * 86400000) });
describe("smart pricing recommendation", () => {
  it("returns a safe empty-history recommendation", () => { const result = recommendPrice([], { items: [] }); expect(result).toMatchObject({ recommendedPrice: 0, confidenceScore: 0, historicalSampleSize: 0, recentTrend: "insufficient-data" }); });
  it("calculates average, median, range, and explanation", () => { const result = recommendPrice([row(300), row(400), row(500)], { items: [{ item: "Sofa", quantity: 1 }] }, 2); expect(result).toMatchObject({ recommendedPrice: 400, averagePrice: 400, medianPrice: 400, minPrice: 300, maxPrice: 500, historicalSampleSize: 3 }); expect(result.explanation).toContain("3 similar jobs"); });
  it("handles even samples, zeros, invalid values, and large history", () => { expect(median([10, 20, 30, 40])).toBe(25); const rows = Array.from({ length: 10000 }, (_, index) => row(index % 2 ? 100 : 110)); const result = recommendPrice([...rows, row(Number.NaN)], { items: [{ item: "Mixed", quantity: 1 }] }); expect(result.historicalSampleSize).toBe(10000); expect(result.confidenceScore).toBeGreaterThan(90); });
  it("scores sparse volatile history below consistent large history", () => { expect(calculateConfidence([row(10), row(1000)], 5)).toBeLessThan(calculateConfidence(Array.from({ length: 20 }, () => row(100)), 5)); });
  it("detects recent trends deterministically", () => { const rows = [row(200, 0), row(210, 1), row(220, 2), row(100, 20), row(100, 30), row(100, 40)]; expect(recommendPrice(rows, { items: [{ item: "A", quantity: 1 }] }).recentTrend).toBe("rising"); });
});
