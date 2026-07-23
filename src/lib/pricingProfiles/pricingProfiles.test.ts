import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { validatePricingProfile } from "./pricingProfiles";
import type { PricingProfileInput } from "./types";

const valid: PricingProfileInput = {
  name: "Residential", description: "", minimumCharge: 175, tripFee: 25,
  laborRate: 85, dumpFee: 40, mileageRate: 1.5, fuelSurcharge: 10,
  defaultCrewSize: 2, taxEnabled: true, taxRate: 8.25, currency: "USD", displayOrder: 0,
};

describe("pricing profile validation", () => {
  it("accepts production profile defaults", () => {
    expect(() => validatePricingProfile(valid)).not.toThrow();
  });

  it.each(["minimumCharge", "tripFee", "laborRate", "dumpFee", "mileageRate", "fuelSurcharge"] as const)(
    "rejects a negative %s",
    (field) => expect(() => validatePricingProfile({ ...valid, [field]: -1 })).toThrow("zero or greater"),
  );

  it("validates crew size, tax range, name, currency and display order", () => {
    expect(() => validatePricingProfile({ ...valid, defaultCrewSize: 0 })).toThrow("at least 1");
    expect(() => validatePricingProfile({ ...valid, taxRate: 101 })).toThrow("between 0 and 100");
    expect(() => validatePricingProfile({ ...valid, name: " " })).toThrow("required");
    expect(() => validatePricingProfile({ ...valid, currency: "US" })).toThrow("three-letter");
    expect(() => validatePricingProfile({ ...valid, displayOrder: 1.5 })).toThrow("whole number");
  });
});
