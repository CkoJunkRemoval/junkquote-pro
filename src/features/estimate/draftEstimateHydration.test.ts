import { describe, expect, it } from "vitest";

import { hydrateDraftEstimate, type PersistedDraftEstimate } from "./draftEstimateHydration";

function createDraft(overrides: Partial<PersistedDraftEstimate> = {}): PersistedDraftEstimate {
  return {
    id: "estimate-1",
    customerId: "customer-1",
    propertyId: "property-1",
    currentStep: 4,
    pricingDiscount: 15,
    pricingProfileId: "profile-1",
    pricingProfile: {
      name: "Standard",
      minimumCharge: 175,
      tripFee: 0,
      laborRate: 85,
      dumpFee: 0,
      mileageRate: 0,
      fuelSurcharge: 0,
      defaultCrewSize: 2,
      taxEnabled: true,
      taxRate: 8.25,
      currency: "USD",
    },
    status: "Draft",
    customer: {
      id: "customer-1",
      firstName: "Ada",
      lastName: "Lovelace",
      phone: "555-0100",
      email: "ada@example.com",
    },
    property: {
      id: "property-1",
      address: "1 Main St",
      city: "Boston",
      state: "MA",
      zip: "02101",
      gateCode: "1234",
      accessNotes: "Call ahead",
    },
    jobSites: [{
      id: "site-1",
      name: "Garage",
      status: "not-started",
      customerNotes: "Use side door",
      crewNotes: "",
      internalNotes: "",
      items: [{
        id: "item-1",
        itemId: "refrigerator",
        name: "Refrigerator",
        category: "Appliance",
        quantity: 2,
        notes: "Basement unit",
        priceOverride: 0,
      }],
    }],
    ...overrides,
  };
}

describe("draft estimate hydration", () => {
  it("rebuilds the same persisted state after a refresh", () => {
    const restored = hydrateDraftEstimate(createDraft());
    const item = restored.estimate.jobSites[0].items[0];

    expect(restored.wizardStep).toBe(4);
    expect(item.quantity).toBe(2);
    expect(item.notes).toBe("Basement unit");
    expect(item.priceOverride).toBe(0);
    expect(restored.estimate.pricing.discount).toBe(15);
    expect(restored.estimate.pricing.total).toBeGreaterThan(0);
  });

  it("uses the saved step for Resume Draft and derives legacy draft progress", () => {
    expect(hydrateDraftEstimate(createDraft({ currentStep: 5 })).wizardStep).toBe(5);
    expect(hydrateDraftEstimate(createDraft({ currentStep: 1, jobSites: [] })).wizardStep).toBe(3);
  });
});
