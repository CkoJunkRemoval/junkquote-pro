import { describe, expect, it } from "vitest";
import { hasTimeCapability, requireTimeCapability } from "./permissions";

describe("timekeeping permissions", () => {
  it("allows workers to manage only their own time", () => {
    expect(hasTimeCapability("Crew", "time.self.clock")).toBe(true);
    expect(hasTimeCapability("Crew", "time.self.requestCorrection")).toBe(true);
    expect(hasTimeCapability("Crew", "time.team.view")).toBe(false);
  });

  it("does not grant payroll exports to dispatch-oriented roles", () => {
    expect(hasTimeCapability("Manager", "time.export")).toBe(false);
    expect(hasTimeCapability("Office", "time.export")).toBe(false);
  });

  it("restricts lock and export controls to owner and admin", () => {
    for (const role of ["Owner", "Admin"] as const) {
      expect(hasTimeCapability(role, "time.lock.manage")).toBe(true);
      expect(hasTimeCapability(role, "time.export")).toBe(true);
    }
  });

  it("fails closed for unauthorized capabilities", () => {
    expect(() => requireTimeCapability("Crew", "time.timesheet.approve")).toThrow(
      "permission",
    );
  });
});
