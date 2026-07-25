import { describe, expect, it } from "vitest";
import { assertWorkforceStatusTransition, canTransitionWorkforceStatus } from "./status";

describe("workforce status transitions", () => {
  it("supports onboarding, leave, suspension, termination, and reactivation", () => {
    expect(canTransitionWorkforceStatus("Onboarding", "Active")).toBe(true);
    expect(canTransitionWorkforceStatus("Active", "Leave")).toBe(true);
    expect(canTransitionWorkforceStatus("Active", "Suspended")).toBe(true);
    expect(canTransitionWorkforceStatus("Active", "Terminated")).toBe(true);
    expect(canTransitionWorkforceStatus("Terminated", "Active")).toBe(true);
  });

  it("rejects invalid transitions", () => {
    expect(() => assertWorkforceStatusTransition("Onboarding", "Suspended")).toThrow("cannot move");
  });
});

