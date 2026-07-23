import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import {
  bulkUpdateItemLibrary, createItemLibraryItem, deleteItemLibraryItem, duplicateItemLibraryItem,
  importItemLibrary, listEffectiveEstimateItems, setItemLibraryActive, updateItemLibraryItem,
  upsertItemOverride,
} from "@/lib/itemLibrary/itemLibrary";
import { exportItemLibraryCsv } from "@/lib/itemLibrary/csv";
import { createEstimateItem } from "@/lib/estimateItems/createEstimateItem";
import { changeEstimatePricingProfile } from "@/lib/pricingProfiles/pricingProfiles";
import type { ItemLibraryInput } from "@/lib/itemLibrary/types";

const input: ItemLibraryInput = {
  category: "Appliances", name: "Refrigerator", description: "Full size", active: true,
  displayOrder: 1, basePrice: 40, disposalFee: 20, laborHours: .75, weightClass: "Heavy",
  estimatedVolume: 25, recyclable: true, donationEligible: false, hazardous: false,
  refrigerant: true, electronics: false, mattress: false, tire: false, appliance: true,
  constructionDebris: false, yardWaste: false, requiresTwoPeople: true,
  requiresDisassembly: false, requiresSpecialEquipment: false, notes: null,
};

describe("Smart Item Pricing", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("enforces tenant isolation and active name uniqueness within a category", async () => {
    const { a, b } = await createTenantFixtures();
    const item = await createItemLibraryItem(a.company.id, a.user.id, input);
    await expect(createItemLibraryItem(a.company.id, a.user.id, { ...input, name: "refrigerator" })).rejects.toThrow("already exists");
    await expect(createItemLibraryItem(a.company.id, a.user.id, { ...input, category: "Office" })).resolves.toMatchObject({ category: "Office" });
    await expect(updateItemLibraryItem(b.company.id, b.user.id, item.id, input)).rejects.toThrow("not found");
    await expect(duplicateItemLibraryItem(a.company.id, a.user.id, item.id)).resolves.toMatchObject({ name: "Refrigerator Copy" });
  });

  it("supports bounded bulk pricing, labor, disposal, category, recycling and archive operations", async () => {
    const { a } = await createTenantFixtures();
    const first = await createItemLibraryItem(a.company.id, a.user.id, input);
    const second = await createItemLibraryItem(a.company.id, a.user.id, { ...input, name: "Freezer" });
    await bulkUpdateItemLibrary(a.company.id, a.user.id, { category: "Appliances", pricePercent: 25, laborHours: 1, disposalFee: 30, recyclable: false, moveCategory: "Commercial Appliances" });
    expect(await prisma.itemLibrary.findMany({ where: { id: { in: [first.id, second.id] } }, orderBy: { name: "asc" } })).toEqual(expect.arrayContaining([expect.objectContaining({ basePrice: 50, laborHours: 1, disposalFee: 30, recyclable: false, category: "Commercial Appliances" })]));
    await setItemLibraryActive(a.company.id, a.user.id, [first.id, second.id], false);
    expect(await prisma.itemLibrary.count({ where: { id: { in: [first.id, second.id] }, active: false } })).toBe(2);
    await setItemLibraryActive(a.company.id, a.user.id, [first.id], true);
    expect(await prisma.itemLibrary.findUniqueOrThrow({ where: { id: first.id } })).toMatchObject({ active: true });
  });

  it("inherits master pricing and applies sparse profile overrides without N+1 queries", async () => {
    const { a } = await createTenantFixtures();
    const item = await createItemLibraryItem(a.company.id, a.user.id, input);
    expect((await listEffectiveEstimateItems(a.company.id, a.pricingProfile.id)).find((row) => row.id === item.id)).toMatchObject({ effectiveBasePrice: 40, effectiveDisposalFee: 20, effectiveCrewRequirement: 2, hasOverride: false });
    await upsertItemOverride(a.company.id, a.user.id, a.pricingProfile.id, item.id, { basePrice: 65, disposalFee: null, laborHours: .5, crewRequirement: 3 });
    expect((await listEffectiveEstimateItems(a.company.id, a.pricingProfile.id)).find((row) => row.id === item.id)).toMatchObject({ effectiveBasePrice: 65, effectiveDisposalFee: 20, effectiveLaborHours: .5, effectiveCrewRequirement: 3, hasOverride: true });
  });

  it("snapshots effective pricing on estimates and protects historical items from deletion", async () => {
    const { a } = await createTenantFixtures();
    const item = await createItemLibraryItem(a.company.id, a.user.id, input);
    await upsertItemOverride(a.company.id, a.user.id, a.pricingProfile.id, item.id, { basePrice: 65 });
    const site = await prisma.jobSite.create({ data: { estimateId: a.estimate.id, name: "Kitchen", sortOrder: 0 } });
    await prisma.estimate.update({ where: { id: a.estimate.id }, data: { status: "Draft", signedAt: null } });
    const selected = await createEstimateItem(a.company.id, { jobSiteId: site.id, itemLibraryId: item.id, quantity: 1, sortOrder: 0 });
    expect(selected).toMatchObject({ libraryItemId: item.id, basePrice: 65, disposalFee: 20, laborHours: .75, crewRequirement: 2, refrigerant: true });
    await setItemLibraryActive(a.company.id, a.user.id, [item.id], false);
    await expect(deleteItemLibraryItem(a.company.id, a.user.id, item.id)).rejects.toThrow("referenced");
  });

  it("requires confirmation before profile switching replaces manual item pricing", async () => {
    const { a } = await createTenantFixtures();
    const item = await createItemLibraryItem(a.company.id, a.user.id, input);
    const other = await prisma.pricingProfile.create({ data: { companyId: a.company.id, name: "Commercial", laborRate: 100 } });
    await upsertItemOverride(a.company.id, a.user.id, other.id, item.id, { basePrice: 65 });
    const site = await prisma.jobSite.create({ data: { estimateId: a.estimate.id, name: "Kitchen", sortOrder: 0 } });
    await prisma.estimate.update({ where: { id: a.estimate.id }, data: { status: "Draft", signedAt: null } });
    const selected = await createEstimateItem(a.company.id, { jobSiteId: site.id, itemLibraryId: item.id, quantity: 1, sortOrder: 0 });
    await prisma.estimateItem.update({ where: { id: selected.id }, data: { priceOverride: 99, pricingManuallyEdited: true } });
    await expect(changeEstimatePricingProfile(a.company.id, a.user.id, a.estimate.id, other.id)).rejects.toThrow("confirmation");
    await changeEstimatePricingProfile(a.company.id, a.user.id, a.estimate.id, other.id, true);
    expect(await prisma.estimateItem.findUniqueOrThrow({ where: { id: selected.id } })).toMatchObject({ basePrice: 65, priceOverride: null, pricingManuallyEdited: false });
  });

  it("previews and imports validated CSV data", async () => {
    const { a } = await createTenantFixtures();
    const csv = exportItemLibraryCsv([{ ...input, category: "Custom", name: "Imported Item" }]);
    await expect(importItemLibrary(a.company.id, a.user.id, csv)).resolves.toEqual({ count: 1 });
    expect(await prisma.itemLibrary.findFirst({ where: { companyId: a.company.id, name: "Imported Item" } })).toMatchObject({ category: "Custom", basePrice: 40 });
  });
});
