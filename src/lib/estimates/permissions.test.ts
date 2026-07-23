import { describe, expect, it } from "vitest";
import { canCreateEstimateForRole } from "./permissions";

describe("estimate-create permissions", () => {
  it("matches the server-enforced estimate creation roles", () => {
    for (const role of ["Owner", "Admin", "Manager", "Office"] as const) {
      expect(canCreateEstimateForRole(role)).toBe(true);
    }
    expect(canCreateEstimateForRole("Crew")).toBe(false);
  });
});
