import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { applyFirstRunPricingLibrary, resetToStandardLibrary } from "@/lib/itemLibrary/standardLibrary";
import { DEFAULT_ITEM_LIBRARY } from "@/lib/itemLibrary/defaultItems";
import { resetIntegrationDatabase } from "./fixtures";

async function tenant(label: string) {
  const company = await prisma.company.create({ data: { name: label } });
  const user = await prisma.user.create({ data: { companyId: company.id, email: `${label}@standard.test`, passwordHash: "test", role: "OWNER" } });
  const profile = await prisma.pricingProfile.create({ data: { companyId: company.id, name: "Standard", defaultProfile: true } });
  await prisma.companyOnboarding.create({ data: { companyId: company.id } });
  await prisma.companySettings.create({ data: { companyId: company.id } });
  return { company, user, profile };
}

describe("JunkQuote Standard Library integration", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("initializes one tenant with its selected market and profile defaults", async () => {
    const a = await tenant("standard-a");
    const b = await tenant("standard-b");
    const result = await applyFirstRunPricingLibrary(a.company.id, a.user.id, {
      region: "Richmond, VA",
      minimumCharge: 125,
      pricingMarket: "highCost",
      averageDumpFee: 75,
      averageCrewSize: 3,
    });
    expect(result).toMatchObject({ itemCount: DEFAULT_ITEM_LIBRARY.length, multiplier: 1.15 });
    expect(await prisma.itemLibrary.count({ where: { companyId: a.company.id } })).toBe(DEFAULT_ITEM_LIBRARY.length);
    expect(await prisma.itemLibrary.count({ where: { companyId: b.company.id } })).toBe(0);
    expect(await prisma.itemLibrary.findFirstOrThrow({ where: { companyId: a.company.id, name: "Refrigerator" } })).toMatchObject({ basePrice: 74.75, estimateRequired: false });
    expect(await prisma.itemLibrary.findFirstOrThrow({ where: { companyId: a.company.id, name: "Concrete" } })).toMatchObject({ basePrice: 0, estimateRequired: true });
    expect(await prisma.pricingProfile.findUniqueOrThrow({ where: { id: a.profile.id } })).toMatchObject({ minimumCharge: 125, dumpFee: 75, defaultCrewSize: 3 });
  });

  it("cannot silently reapply the first-run multiplier", async () => {
    const a = await tenant("one-time");
    const input = { region: "Central VA", minimumCharge: 100, pricingMarket: "premium" as const, averageDumpFee: 50, averageCrewSize: 2 };
    await applyFirstRunPricingLibrary(a.company.id, a.user.id, input);
    await expect(applyFirstRunPricingLibrary(a.company.id, a.user.id, input)).rejects.toThrow("already been initialized");
  });

  it("resets only library data while preserving historical estimate snapshots", async () => {
    const a = await tenant("reset");
    const customer = await prisma.customer.create({ data: { companyId: a.company.id, firstName: "A", lastName: "Customer", phone: "555" } });
    const property = await prisma.property.create({ data: { customerId: customer.id, address: "1 Main", city: "Town", state: "VA", zip: "23220" } });
    const estimate = await prisma.estimate.create({ data: { companyId: a.company.id, customerId: customer.id, propertyId: property.id, pricingProfileId: a.profile.id, pricingTotal: 99 } });
    const site = await prisma.jobSite.create({ data: { estimateId: estimate.id, name: "Garage", sortOrder: 0 } });
    const custom = await prisma.itemLibrary.create({ data: { companyId: a.company.id, category: "Custom", name: "Custom Item", basePrice: 99 } });
    const snapshot = await prisma.estimateItem.create({ data: { jobSiteId: site.id, libraryItemId: custom.id, itemId: custom.id, name: "Custom Item", category: "Custom", quantity: 1, basePrice: 99, sortOrder: 0 } });
    await resetToStandardLibrary(a.company.id, a.user.id);
    expect(await prisma.customer.count({ where: { companyId: a.company.id } })).toBe(1);
    expect(await prisma.estimate.findUnique({ where: { id: estimate.id } })).toMatchObject({ pricingTotal: 99 });
    expect(await prisma.estimateItem.findUnique({ where: { id: snapshot.id } })).toMatchObject({ name: "Custom Item", basePrice: 99, libraryItemId: null });
  });
});
