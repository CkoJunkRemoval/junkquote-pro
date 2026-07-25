import { describe, expect, it } from "vitest";
import { hasWorkforceCapability, requireWorkforceCapability } from "./permissions";

describe("workforce permissions", () => {
  it("restricts compensation to owner and admin roles", () => {
    expect(hasWorkforceCapability("Owner", "workforce.compensation.view")).toBe(true);
    expect(hasWorkforceCapability("Admin", "workforce.compensation.manage")).toBe(true);
    expect(hasWorkforceCapability("Manager", "workforce.compensation.view")).toBe(false);
    expect(hasWorkforceCapability("Office", "workforce.compensation.manage")).toBe(false);
    expect(hasWorkforceCapability("Crew", "workforce.view")).toBe(false);
  });

  it("fails closed when a capability is absent", () => {
    expect(() => requireWorkforceCapability("Crew", "workforce.documents.view")).toThrow("permission");
  });
});

