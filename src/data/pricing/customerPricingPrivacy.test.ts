import { describe, expect, it } from "vitest";
import { buildPersistedCustomerPricingBreakdown } from "./livePricingBreakdown";

describe("customer pricing privacy", () => {
  it("aggregates internal rules behind customer-safe labels", () => {
    const result = buildPersistedCustomerPricingBreakdown({
      items: [{ id: "item", name: "Sofa", quantity: 1, basePrice: 100, priceOverride: null }],
      rules: [
        { id: "internal-a", name: "Margin Recovery Rule", calculatedAmount: 20, status: "Applied" },
        { id: "internal-b", name: "Secret Discount Rule", calculatedAmount: -5, status: "Applied" },
      ],
      pricing: { subtotal: 100, labor: 0, disposal: 0, discount: 0, total: 115 },
    });
    const serialized = JSON.stringify(result);
    expect(serialized).toContain("Additional service charges");
    expect(serialized).not.toContain("Margin Recovery Rule");
    expect(serialized).not.toContain("Secret Discount Rule");
  });
});
