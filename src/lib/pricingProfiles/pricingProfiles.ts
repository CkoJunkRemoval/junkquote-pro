import "server-only";
import { prisma } from "@/lib/prisma";
import { isEstimateLocked } from "@/lib/estimates/isEstimateLocked";
import type { PricingProfileInput } from "./types";

const moneyFields = ["minimumCharge", "tripFee", "laborRate", "dumpFee", "mileageRate", "fuelSurcharge"] as const;
const clean = (value?: string | null) => value?.trim() || null;

export function validatePricingProfile(input: PricingProfileInput) {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Profile name is required.");
  if (input.name.trim().length > 100) errors.push("Profile name must be 100 characters or fewer.");
  for (const field of moneyFields) {
    if (!Number.isFinite(input[field]) || input[field] < 0) errors.push(`${field} must be zero or greater.`);
  }
  if (!Number.isInteger(input.defaultCrewSize) || input.defaultCrewSize < 1) errors.push("Default crew size must be at least 1.");
  if (!Number.isFinite(input.taxRate) || input.taxRate < 0 || input.taxRate > 100) errors.push("Tax rate must be between 0 and 100.");
  if (!/^[A-Z]{3}$/.test(input.currency.trim().toUpperCase())) errors.push("Currency must be a three-letter code.");
  if (!Number.isInteger(input.displayOrder)) errors.push("Display order must be a whole number.");
  if (errors.length) throw new Error(errors.join(" "));
}

function data(input: PricingProfileInput) {
  validatePricingProfile(input);
  return {
    name: input.name.trim(),
    description: clean(input.description),
    minimumCharge: input.minimumCharge,
    tripFee: input.tripFee,
    laborRate: input.laborRate,
    dumpFee: input.dumpFee,
    mileageRate: input.mileageRate,
    fuelSurcharge: input.fuelSurcharge,
    defaultCrewSize: input.defaultCrewSize,
    taxEnabled: input.taxEnabled,
    taxRate: input.taxRate,
    currency: input.currency.trim().toUpperCase(),
    displayOrder: input.displayOrder,
  };
}

async function assertUniqueActiveName(companyId: string, name: string, excludeId?: string) {
  const duplicate = await prisma.pricingProfile.findFirst({
    where: { companyId, active: true, name: { equals: name.trim(), mode: "insensitive" }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { id: true },
  });
  if (duplicate) throw new Error("An active pricing profile with this name already exists.");
}

export async function listPricingProfiles(companyId: string, includeArchived = true) {
  return prisma.pricingProfile.findMany({
    where: { companyId, ...(includeArchived ? {} : { active: true }) },
    orderBy: [{ defaultProfile: "desc" }, { active: "desc" }, { displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { estimates: true } } },
  });
}

export async function getActivePricingProfiles(companyId: string) {
  return prisma.pricingProfile.findMany({ where: { companyId, active: true }, orderBy: [{ defaultProfile: "desc" }, { displayOrder: "asc" }, { name: "asc" }] });
}

export async function createPricingProfile(companyId: string, actingUserId: string, input: PricingProfileInput) {
  const next = data(input);
  await assertUniqueActiveName(companyId, next.name);
  const hasDefault = await prisma.pricingProfile.findFirst({ where: { companyId, defaultProfile: true }, select: { id: true } });
  return prisma.$transaction(async (tx) => {
    const profile = await tx.pricingProfile.create({ data: { companyId, ...next, defaultProfile: !hasDefault } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Profile Created", entityType: "PricingProfile", entityId: profile.id } });
    return profile;
  });
}

export async function updatePricingProfile(companyId: string, actingUserId: string, profileId: string, input: PricingProfileInput) {
  const profile = await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId }, select: { id: true, active: true } });
  if (!profile) throw new Error("Pricing profile not found.");
  const next = data(input);
  if (profile.active) await assertUniqueActiveName(companyId, next.name, profile.id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.pricingProfile.update({ where: { id: profile.id }, data: next });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Profile Updated", entityType: "PricingProfile", entityId: profile.id } });
    return updated;
  });
}

export async function duplicatePricingProfile(companyId: string, actingUserId: string, profileId: string) {
  const source = await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId } });
  if (!source) throw new Error("Pricing profile not found.");
  let name = `${source.name} Copy`, suffix = 2;
  while (await prisma.pricingProfile.findFirst({ where: { companyId, active: true, name: { equals: name, mode: "insensitive" } }, select: { id: true } })) name = `${source.name} Copy ${suffix++}`;
  return createPricingProfile(companyId, actingUserId, {
    name, description: source.description, minimumCharge: source.minimumCharge, tripFee: source.tripFee,
    laborRate: source.laborRate, dumpFee: source.dumpFee, mileageRate: source.mileageRate,
    fuelSurcharge: source.fuelSurcharge, defaultCrewSize: source.defaultCrewSize,
    taxEnabled: source.taxEnabled, taxRate: source.taxRate, currency: source.currency,
    displayOrder: source.displayOrder + 1,
  });
}

export async function setDefaultPricingProfile(companyId: string, actingUserId: string, profileId: string) {
  const profile = await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId, active: true }, select: { id: true } });
  if (!profile) throw new Error("Only an active pricing profile can be the default.");
  return prisma.$transaction(async (tx) => {
    await tx.pricingProfile.updateMany({ where: { companyId, defaultProfile: true, id: { not: profile.id } }, data: { defaultProfile: false } });
    const updated = await tx.pricingProfile.update({ where: { id: profile.id }, data: { defaultProfile: true } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Profile Default Changed", entityType: "PricingProfile", entityId: profile.id } });
    return updated;
  });
}

export async function setPricingProfileArchived(companyId: string, actingUserId: string, profileId: string, archived: boolean) {
  const profile = await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId }, select: { id: true, name: true, defaultProfile: true } });
  if (!profile) throw new Error("Pricing profile not found.");
  if (archived && profile.defaultProfile) throw new Error("The default pricing profile cannot be archived. Select another default first.");
  if (!archived) await assertUniqueActiveName(companyId, profile.name, profile.id);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.pricingProfile.update({ where: { id: profile.id }, data: { active: !archived } });
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: archived ? "Pricing Profile Archived" : "Pricing Profile Restored", entityType: "PricingProfile", entityId: profile.id } });
    return updated;
  });
}

export async function deletePricingProfile(companyId: string, actingUserId: string, profileId: string) {
  const profile = await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId }, select: { id: true, defaultProfile: true, _count: { select: { estimates: true } } } });
  if (!profile) throw new Error("Pricing profile not found.");
  if (profile.defaultProfile) throw new Error("The default pricing profile cannot be deleted.");
  if (profile._count.estimates > 0) throw new Error("This pricing profile is in use and must be archived instead of deleted.");
  return prisma.$transaction(async (tx) => {
    await tx.auditEvent.create({ data: { companyId, actingUserId, eventType: "Pricing Profile Deleted", entityType: "PricingProfile", entityId: profile.id } });
    return tx.pricingProfile.delete({ where: { id: profile.id } });
  });
}

export async function getPricingProfileForEstimate(companyId: string, profileId?: string | null) {
  const profile = profileId
    ? await prisma.pricingProfile.findFirst({ where: { id: profileId, companyId, active: true } })
    : await prisma.pricingProfile.findFirst({ where: { companyId, active: true, defaultProfile: true } });
  if (!profile) throw new Error(profileId ? "Pricing profile not found." : "A default pricing profile is required.");
  return profile;
}

export async function changeEstimatePricingProfile(
  companyId: string,
  actingUserId: string,
  estimateId: string,
  profileId: string,
  replaceManualItemPricing = false,
) {
  return prisma.$transaction(async (tx) => {
    const [estimate, profile] = await Promise.all([
      tx.estimate.findFirst({ where: { id: estimateId, companyId } }),
      tx.pricingProfile.findFirst({ where: { id: profileId, companyId, active: true } }),
    ]);
    if (!estimate) throw new Error("Estimate not found.");
    if (isEstimateLocked(estimate)) throw new Error("Approved estimates are read-only.");
    if (!profile) throw new Error("Select an active pricing profile.");
    if (estimate.pricingProfileId === profile.id) return profile;
    const estimateItems = await tx.estimateItem.findMany({
      where: { jobSite: { estimateId: estimate.id } },
      include: { libraryItem: { include: { profileOverrides: { where: { pricingProfileId: profile.id } } } } },
    });
    if (!replaceManualItemPricing && estimateItems.some((item) => item.pricingManuallyEdited))
      throw new Error("Manually edited item pricing requires confirmation before changing profiles.");
    await tx.estimate.update({ where: { id: estimate.id }, data: { pricingProfileId: profile.id } });
    for (const item of estimateItems) {
      if (!item.libraryItem) continue;
      const override = item.libraryItem.profileOverrides[0];
      await tx.estimateItem.update({
        where: { id: item.id },
        data: {
          basePrice: override?.basePrice ?? item.libraryItem.basePrice,
          disposalFee: override?.disposalFee ?? item.libraryItem.disposalFee,
          laborHours: override?.laborHours ?? item.libraryItem.laborHours,
          crewRequirement: override?.crewRequirement ?? (item.libraryItem.requiresTwoPeople ? 2 : 1),
          ...(replaceManualItemPricing ? { priceOverride: null, pricingManuallyEdited: false } : {}),
        },
      });
    }
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "Estimate Pricing Profile Changed",
        entityType: "Estimate",
        entityId: estimate.id,
        metadata: { pricingProfileId: profile.id, pricingProfileName: profile.name },
      },
    });
    return profile;
  });
}
