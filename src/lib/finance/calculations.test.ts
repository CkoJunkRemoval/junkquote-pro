import { describe, expect, it } from "vitest";
import {
  advanceRecurringDate,
  calculateOperationalJobCost,
  validateAllocationTotal,
  validateExpenseComponents,
} from "./calculations";

describe("finance calculations", () => {
  it("requires non-negative components to equal the expense total", () => {
    expect(() =>
      validateExpenseComponents({
        subtotalCents: 10_00,
        taxCents: 80,
        tipCents: 20,
        feeCents: 10,
        totalCents: 11_10,
      }),
    ).not.toThrow();
    expect(() =>
      validateExpenseComponents({ subtotalCents: 10_00, totalCents: 9_00 }),
    ).toThrow("components");
    expect(() =>
      validateExpenseComponents({ subtotalCents: -1, totalCents: -1 }),
    ).toThrow("non-negative");
  });

  it("allows partial allocations but never over-allocation", () => {
    expect(validateAllocationTotal(10_00, [3_00, 2_00])).toEqual({
      allocatedCents: 5_00,
      unallocatedCents: 5_00,
    });
    expect(() => validateAllocationTotal(10_00, [8_00, 3_00])).toThrow(
      "cannot exceed",
    );
  });

  it("calculates collected and invoiced advisory profitability separately", () => {
    const result = calculateOperationalJobCost({
      invoicedCents: 100_000,
      collectedCents: 80_000,
      refundCents: 5_000,
      discountCents: 10_000,
      tipCents: 2_000,
      laborCents: 20_000,
      laborMinutes: 600,
      fuelCents: 5_000,
      disposalCents: 10_000,
      maintenanceCents: 0,
      equipmentCents: 2_000,
      subcontractorCents: 0,
      directPurchaseCents: 0,
      otherExpenseCents: 3_000,
      unallocatedExpenseCents: 500,
      missingData: ["Maintenance allocation"],
    });
    expect(result.directCostCents).toBe(40_000);
    expect(result.collectedProfitCents).toBe(37_000);
    expect(result.invoicedProfitCents).toBe(45_000);
    expect(result.completenessScore).toBe(80);
    expect(result.unallocatedCostWarning).toBe(true);
  });

  it("advances recurring due dates deterministically", () => {
    const date = new Date("2026-01-15T00:00:00.000Z");
    expect(advanceRecurringDate(date, "Monthly").toISOString()).toBe(
      "2026-02-15T00:00:00.000Z",
    );
    expect(advanceRecurringDate(date, "Custom", 10).toISOString()).toBe(
      "2026-01-25T00:00:00.000Z",
    );
    expect(() => advanceRecurringDate(date, "Custom")).toThrow(
      "Custom cadence",
    );
  });
});
