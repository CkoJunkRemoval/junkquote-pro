import { describe, expect, it } from "vitest";
import { locationInput, serviceAreaInput } from "./validation";

describe("company hub validation", () => {
  it("normalizes a location without accepting tenant input", () => {
    expect(
      locationInput({
        name: " North ",
        addressLine1: "1 Main",
        city: "Albany",
        state: "NY",
        postalCode: "12207",
      }),
    ).toMatchObject({ name: "North", active: true, managerId: null });
  });

  it("rejects negative travel surcharges", () => {
    expect(() =>
      serviceAreaInput({ kind: "ZIP", value: "12207", distanceCharge: "-1" }),
    ).toThrow("Travel surcharge cannot be negative.");
  });
});
