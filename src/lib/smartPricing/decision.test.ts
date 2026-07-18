import { describe, expect, it } from "vitest";
import { createDecisionSnapshot } from "./decision";
describe("recommendation decision snapshots", () => {
  it("captures accepted, adjusted, ignored, and unavailable decisions", () => { expect(createDecisionSnapshot({ recommendedPrice: 450, manualPrice: 400, appliedPrice: 450, accepted: true }).decision).toBe("Accepted"); expect(createDecisionSnapshot({ recommendedPrice: 450, manualPrice: 400, appliedPrice: 425 }).decision).toBe("PartiallyAdjusted"); expect(createDecisionSnapshot({ recommendedPrice: 450, manualPrice: 400, accepted: false })).toMatchObject({ decision: "Ignored", finalQuotedAmount: 400, difference: -50 }); expect(createDecisionSnapshot({ recommendedPrice: 0, manualPrice: 400 }).decision).toBe("Unavailable"); });
});
