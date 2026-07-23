import { describe, expect, it } from "vitest";

import { toEstimateItem } from "@/features/estimate/estimateItemMapper";
import { Estimate, EstimateItem } from "@/features/estimate/types";
import { EstimateStatus } from "@/features/estimate/status";

import { calculateEstimate } from "./calculateEstimate";

function createEstimate(item: EstimateItem): Estimate {
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
        items: [item],
        subtotal: 0,
      },
    ],
    pricing: {
      subtotal: 0,
      labor: 0,
      disposal: 0,
      discount: 0,
      total: 0,
    },
    status: EstimateStatus.Draft,
    timeline: [],
  };
}

function box(priceOverride?: number): EstimateItem {
  return {
    basePrice: 8, disposalFee: 0, laborHours: .1, weightClass: "Light",
    estimatedVolume: 2, crewRequirement: 1, recyclable: true, donationEligible: false,
    hazardous: false, refrigerant: false, electronics: false, mattress: false,
    tire: false, appliance: false, constructionDebris: false, yardWaste: false,
    requiresDisassembly: false, requiresSpecialEquipment: false, pricingManuallyEdited: priceOverride !== undefined,
    id: "box-1",
    itemId: "box",
    name: "Boxes",
    category: "Household",
    quantity: 10,
    notes: "",
    priceOverride,
  };
}

describe("estimate item price overrides", () => {
  it("uses the default item price with no override", () => {
    expect(calculateEstimate(createEstimate(box())).total).toBe(145);
  });

  it("uses a positive override instead of the default item price", () => {
    expect(calculateEstimate(createEstimate(box(20))).total).toBe(265);
  });

  it("uses a zero override instead of falling back to default pricing", () => {
    expect(calculateEstimate(createEstimate(box(0))).total).toBe(125);
  });

  it("uses default pricing again when an override is cleared", () => {
    expect(calculateEstimate(createEstimate(box(undefined))).total).toBe(145);
  });

  it("preserves a zero override when an item is reloaded", () => {
    const reloadedItem = toEstimateItem({
      basePrice: 8, disposalFee: 0, laborHours: .1, weightClass: "Light",
      estimatedVolume: 2, crewRequirement: 1, recyclable: true, donationEligible: false,
      hazardous: false, refrigerant: false, electronics: false, mattress: false,
      tire: false, appliance: false, constructionDebris: false, yardWaste: false,
      requiresDisassembly: false, requiresSpecialEquipment: false, pricingManuallyEdited: true,
      id: "box-1",
      itemId: "box",
      name: "Boxes",
      category: "Household",
      quantity: 10,
      notes: "",
      priceOverride: 0,
    });

    expect(reloadedItem.priceOverride).toBe(0);
    expect(calculateEstimate(createEstimate(reloadedItem)).total).toBe(125);
  });
});
