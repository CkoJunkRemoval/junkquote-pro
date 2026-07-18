import { describe, expect, it } from "vitest";
import { analyticsAccess } from "./permissions";
describe("analytics permissions", () => {
  it("allows full owner/admin analytics", () => {
    expect(analyticsAccess("Owner")).toMatchObject({
      allowed: true,
      showProfit: true,
    });
    expect(analyticsAccess("Admin").showProfit).toBe(true);
  });
  it("hides profit from Office", () =>
    expect(analyticsAccess("Office")).toMatchObject({
      allowed: true,
      showProfit: false,
    }));
  it("denies Crew", () => expect(analyticsAccess("Crew").allowed).toBe(false));
});
