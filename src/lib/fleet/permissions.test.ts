import { describe, expect, it } from "vitest";
import { hasFleetCapability, requireFleetCapability } from "./permissions";

describe("fleet permissions", () => {
  it("allows owners and admins full fleet access", () => {
    for (const role of ["Owner", "Admin"] as const) {
      expect(hasFleetCapability(role, "fleet.costs.view")).toBe(true);
      expect(hasFleetCapability(role, "fleet.manage")).toBe(true);
    }
  });

  it("does not expose fleet costs to ordinary operational roles", () => {
    expect(hasFleetCapability("Manager", "fleet.costs.view")).toBe(false);
    expect(hasFleetCapability("Office", "fleet.costs.view")).toBe(false);
    expect(hasFleetCapability("Crew", "fleet.costs.view")).toBe(false);
  });

  it("allows assigned mileage without exposing cost-bearing fuel entry", () => {
    expect(hasFleetCapability("Crew", "fleet.mileage.log")).toBe(true);
    expect(hasFleetCapability("Crew", "fleet.fuel.log")).toBe(false);
    expect(hasFleetCapability("Crew", "fleet.manage")).toBe(false);
  });

  it("fails closed for unauthorized capabilities", () => {
    expect(() => requireFleetCapability("Crew", "fleet.assign")).toThrow(
      "permission",
    );
  });
});
