import { describe, expect, it } from "vitest";
import {
  assertNoRecursiveParent,
  deriveFuelMetrics,
  maintenanceStatus,
  validateFuelConsistency,
} from "./calculations";

describe("fleet calculations", () => {
  it("accepts fuel totals within cent rounding tolerance", () => {
    expect(() =>
      validateFuelConsistency({
        gallons: 10.01,
        totalCostCents: 3504,
        pricePerGallonCents: 350,
      }),
    ).not.toThrow();
  });

  it("rejects inconsistent fuel totals", () => {
    expect(() =>
      validateFuelConsistency({
        gallons: 10,
        totalCostCents: 5000,
        pricePerGallonCents: 350,
      }),
    ).toThrow("inconsistent");
  });

  it("rejects negative costs and zero gallons", () => {
    expect(() =>
      validateFuelConsistency({
        gallons: 0,
        totalCostCents: 0,
        pricePerGallonCents: 0,
      }),
    ).toThrow("greater than zero");
  });

  it("calculates MPG and cost per mile from two full fills", () => {
    expect(
      deriveFuelMetrics(
        {
          odometerMiles: 1100,
          gallons: 10,
          totalCostCents: 4000,
          fullTank: true,
        },
        { odometerMiles: 1000, fullTank: true },
      ),
    ).toEqual({
      milesSincePriorFill: 100,
      estimatedMpg: 10,
      costPerMileCents: 40,
    });
  });

  it("does not fabricate MPG without sufficient fill data", () => {
    expect(
      deriveFuelMetrics(
        {
          odometerMiles: 1100,
          gallons: 10,
          totalCostCents: 4000,
          fullTank: true,
        },
        null,
      ).estimatedMpg,
    ).toBeNull();
  });

  it("does not fabricate MPG for partial fills", () => {
    expect(
      deriveFuelMetrics(
        {
          odometerMiles: 1100,
          gallons: 10,
          totalCostCents: 4000,
          fullTank: false,
        },
        { odometerMiles: 1000, fullTank: true },
      ).estimatedMpg,
    ).toBeNull();
  });

  it("calculates mileage-triggered service states", () => {
    expect(
      maintenanceStatus({
        triggerType: "Mileage",
        dueOdometerMiles: 10_000,
        currentOdometerMiles: 10_001,
        warningLeadMiles: 500,
        warningLeadDays: 30,
      }),
    ).toBe("Overdue");
    expect(
      maintenanceStatus({
        triggerType: "Mileage",
        dueOdometerMiles: 10_000,
        currentOdometerMiles: 9_750,
        warningLeadMiles: 500,
        warningLeadDays: 30,
      }),
    ).toBe("DueSoon");
  });

  it("calculates date-triggered service states", () => {
    const now = new Date("2026-07-24T12:00:00Z");
    expect(
      maintenanceStatus({
        triggerType: "Date",
        dueDate: new Date("2026-07-23T12:00:00Z"),
        warningLeadMiles: 500,
        warningLeadDays: 30,
        now,
      }),
    ).toBe("Overdue");
    expect(
      maintenanceStatus({
        triggerType: "Date",
        dueDate: new Date("2026-08-01T12:00:00Z"),
        warningLeadMiles: 500,
        warningLeadDays: 30,
        now,
      }),
    ).toBe("DueSoon");
  });

  it("uses the first due trigger for combined schedules", () => {
    expect(
      maintenanceStatus({
        triggerType: "CombinedMileageOrDate",
        dueDate: new Date("2027-01-01T00:00:00Z"),
        dueOdometerMiles: 5000,
        currentOdometerMiles: 5100,
        warningLeadMiles: 500,
        warningLeadDays: 30,
        now: new Date("2026-07-24T00:00:00Z"),
      }),
    ).toBe("Overdue");
  });

  it("prevents direct recursive parent assignments", () => {
    expect(() => assertNoRecursiveParent("a", "a", new Map())).toThrow(
      "Recursive",
    );
  });

  it("prevents indirect recursive parent assignments", () => {
    expect(() =>
      assertNoRecursiveParent(
        "truck",
        "trailer",
        new Map([
          ["trailer", "tool"],
          ["tool", "truck"],
        ]),
      ),
    ).toThrow("Recursive");
  });

  it("accepts an acyclic parent hierarchy", () => {
    expect(() =>
      assertNoRecursiveParent("tool", "truck", new Map([["truck", null]])),
    ).not.toThrow();
  });
});
