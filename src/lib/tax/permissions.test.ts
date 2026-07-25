import { describe, expect, it } from "vitest";
import { hasTaxCapability } from "./permissions";

describe("tax permissions", () => {
  it("allows every tax capability only for owners and admins", () => {
    expect(hasTaxCapability("Owner", "tax.exports")).toBe(true);
    expect(hasTaxCapability("Admin", "tax.documents.manage")).toBe(true);
    expect(hasTaxCapability("Manager", "tax.view")).toBe(false);
    expect(hasTaxCapability("Office", "tax.view")).toBe(false);
    expect(hasTaxCapability("Crew", "tax.view")).toBe(false);
  });
});
