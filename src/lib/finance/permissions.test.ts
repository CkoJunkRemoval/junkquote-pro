import { describe, expect, it } from "vitest";
import { hasFinanceCapability, requireFinanceCapability } from "./permissions";

describe("finance permissions", () => {
  it("limits complete finance and cost visibility to Owner and Admin", () => {
    for (const role of ["Owner", "Admin"] as const) {
      expect(hasFinanceCapability(role, "finance.costs.view")).toBe(true);
      expect(
        hasFinanceCapability(role, "finance.incomeAdjustments.manage"),
      ).toBe(true);
    }
    expect(hasFinanceCapability("Manager", "finance.costs.view")).toBe(false);
    expect(hasFinanceCapability("Office", "finance.costs.view")).toBe(false);
  });

  it("keeps Office and Manager out of the broad Finance module", () => {
    expect(hasFinanceCapability("Office", "finance.expenses.manage")).toBe(false);
    expect(hasFinanceCapability("Office", "finance.receipts.manage")).toBe(false);
    expect(hasFinanceCapability("Manager", "finance.view")).toBe(false);
    expect(hasFinanceCapability("Office", "finance.expenses.approve")).toBe(false);
    expect(hasFinanceCapability("Office", "finance.jobCosting.view")).toBe(false);
  });

  it("does not grant Crew finance access", () => {
    expect(hasFinanceCapability("Crew", "finance.view")).toBe(false);
    expect(() => requireFinanceCapability("Crew", "finance.view")).toThrow(
      "permission",
    );
  });
});
