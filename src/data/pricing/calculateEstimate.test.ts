import { describe, expect, it } from "vitest";

import { calculateEstimate } from "./calculateEstimate";
import { Estimate, EstimateItem } from "@/features/estimate/types";
import { EstimateStatus } from "@/features/estimate/status";

function createEstimate(items: EstimateItem[], discount = 0): Estimate {
  return {
    pricingProfileId: "profile-1",
    pricingProfileName: "Standard",
    pricingDefaults: { minimumCharge: 125, tripFee: 0, laborRate: 65, dumpFee: 0, mileageRate: 0, fuelSurcharge: 0, defaultCrewSize: 1, taxEnabled: false, taxRate: 0, currency: "USD" },
    pricingManuallyEdited: false,
    customerType: "existing",
    customer: {
      id: "customer-1",
      firstName: "Taylor",
      lastName: "Smith",
      phone: "555-0100",
      email: "taylor@example.com",
    },
    property: {
      id: "property-1",
      type: "house",
      address: "123 Main St",
      city: "Exampleville",
      state: "NY",
      zip: "10001",
      gateCode: "",
      notes: "",
    },
    jobSites: [
      {
        id: "job-site-1",
        name: "Garage",
        status: "not-started",
        customerNotes: "",
        crewNotes: "",
        internalNotes: "",
        photos: [],
        items,
        subtotal: 0,
      },
    ],
    pricing: {
      subtotal: 0,
      labor: 0,
      disposal: 0,
      discount,
      total: 0,
    },
    status: EstimateStatus.Draft,
    timeline: [],
  };
}

function item(itemId: string, quantity = 1): EstimateItem {
  return {
    basePrice: itemId === "refrigerator" ? 125 : 8, disposalFee: itemId === "refrigerator" ? 25 : 0,
    laborHours: .25, weightClass: itemId === "refrigerator" ? "Heavy" : "Light",
    estimatedVolume: itemId === "refrigerator" ? 25 : 2, crewRequirement: 1,
    recyclable: false, donationEligible: false, hazardous: false, refrigerant: false,
    electronics: false, mattress: false, tire: false, appliance: false,
    constructionDebris: false, yardWaste: false, requiresDisassembly: false,
    requiresSpecialEquipment: false, pricingManuallyEdited: false,
    id: `${itemId}-1`,
    itemId,
    name: itemId,
    category: "Test",
    quantity,
    notes: "",
  };
}

describe("calculateEstimate minimum charge", () => {
  it("uses the selected profile defaults", () => {
    const estimate = createEstimate([]);
    estimate.pricingDefaults.minimumCharge = 321;
    expect(calculateEstimate(estimate).total).toBe(321);
  });

  it("uses the minimum for no items", () => {
    expect(calculateEstimate(createEstimate([])).total).toBe(125);
  });

  it("uses the minimum for one item below the minimum", () => {
    expect(calculateEstimate(createEstimate([item("box")])).total).toBe(125);
  });

  it("uses the minimum once for multiple items below the minimum", () => {
    expect(
      calculateEstimate(createEstimate([item("box", 2)])).total
    ).toBe(125);
  });

  it("uses the calculated total for items above the minimum", () => {
    expect(
      calculateEstimate(createEstimate([item("refrigerator")])).total
    ).toBe(218.75);
  });

  it("applies the minimum after discounts", () => {
    expect(
      calculateEstimate(createEstimate([item("box", 2)], 25)).total
    ).toBe(125);
  });
});
