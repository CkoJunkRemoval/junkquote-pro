import { describe, expect, it } from "vitest";
import { canAccessSmartPricing } from "./permissions";
describe("smart pricing permissions", () => {
  it("limits configuration to owner/admin", () => { expect(canAccessSmartPricing("Owner", "configure")).toBe(true); expect(canAccessSmartPricing("Admin", "configure")).toBe(true); expect(canAccessSmartPricing("Manager", "configure")).toBe(false); });
  it("allows managers to use, office to view, and crew no access", () => { expect(canAccessSmartPricing("Manager", "use")).toBe(true); expect(canAccessSmartPricing("Office", "view")).toBe(true); expect(canAccessSmartPricing("Office", "use")).toBe(false); expect(canAccessSmartPricing("Crew", "view")).toBe(false); });
});
