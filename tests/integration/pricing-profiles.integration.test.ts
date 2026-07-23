import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import {
  changeEstimatePricingProfile, createPricingProfile, deletePricingProfile,
  duplicatePricingProfile, setDefaultPricingProfile, setPricingProfileArchived,
} from "@/lib/pricingProfiles/pricingProfiles";

const input = {
  name: "Commercial", description: "Business jobs", minimumCharge: 300, tripFee: 50,
  laborRate: 100, dumpFee: 75, mileageRate: 2, fuelSurcharge: 15, defaultCrewSize: 3,
  taxEnabled: true, taxRate: 8.25, currency: "USD", displayOrder: 1,
};

describe("Pricing Profiles foundation", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("creates, duplicates and prevents duplicate active names per tenant", async () => {
    const { a, b } = await createTenantFixtures();
    const created = await createPricingProfile(a.company.id, a.user.id, input);
    expect(created).toMatchObject({ companyId: a.company.id, name: "Commercial", active: true });
    await expect(createPricingProfile(a.company.id, a.user.id, { ...input, name: "commercial" })).rejects.toThrow("already exists");
    await expect(createPricingProfile(b.company.id, b.user.id, input)).resolves.toMatchObject({ companyId: b.company.id });
    await expect(duplicatePricingProfile(a.company.id, a.user.id, created.id)).resolves.toMatchObject({ name: "Commercial Copy" });
  });

  it("switches the default atomically and supports archive and restore", async () => {
    const { a } = await createTenantFixtures();
    const created = await createPricingProfile(a.company.id, a.user.id, input);
    await setDefaultPricingProfile(a.company.id, a.user.id, created.id);
    expect(await prisma.pricingProfile.findUniqueOrThrow({ where: { id: a.pricingProfile.id } })).toMatchObject({ defaultProfile: false });
    await expect(setPricingProfileArchived(a.company.id, a.user.id, created.id, true)).rejects.toThrow("default");
    await setDefaultPricingProfile(a.company.id, a.user.id, a.pricingProfile.id);
    await expect(setPricingProfileArchived(a.company.id, a.user.id, created.id, true)).resolves.toMatchObject({ active: false });
    await expect(setPricingProfileArchived(a.company.id, a.user.id, created.id, false)).resolves.toMatchObject({ active: true });
  });

  it("loads a selected profile and protects profiles in use", async () => {
    const { a } = await createTenantFixtures();
    const created = await createPricingProfile(a.company.id, a.user.id, input);
    await expect(changeEstimatePricingProfile(a.company.id, a.user.id, a.estimate.id, created.id)).rejects.toThrow("read-only");
    await prisma.estimate.update({ where: { id: a.estimate.id }, data: { status: "Draft", signedAt: null } });
    await expect(changeEstimatePricingProfile(a.company.id, a.user.id, a.estimate.id, created.id)).resolves.toMatchObject({ id: created.id });
    await setPricingProfileArchived(a.company.id, a.user.id, created.id, true);
    await expect(deletePricingProfile(a.company.id, a.user.id, created.id)).rejects.toThrow("in use");
    await expect(deletePricingProfile(a.company.id, a.user.id, a.pricingProfile.id)).rejects.toThrow("default");
  });

  it("deletes an unused archived non-default profile", async () => {
    const { a } = await createTenantFixtures();
    const created = await createPricingProfile(a.company.id, a.user.id, input);
    await setPricingProfileArchived(a.company.id, a.user.id, created.id, true);
    await deletePricingProfile(a.company.id, a.user.id, created.id);
    expect(await prisma.pricingProfile.findUnique({ where: { id: created.id } })).toBeNull();
  });
});
