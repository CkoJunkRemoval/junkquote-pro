import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  PRICING_MARKETS,
  STANDARD_LIBRARY_VERSION,
  buildStandardItemLibrary,
  normalizePricingMarket,
  standardItemId,
  type PricingMarket,
} from "./defaultItems";

export type StandardLibraryResetOptions = {
  multiplier?: number;
  clearOverrides?: boolean;
};

export type FirstRunPricingInput = {
  region: string;
  minimumCharge: number;
  pricingMarket: PricingMarket;
  averageDumpFee: number;
  averageCrewSize: number;
};

export function validateFirstRunPricing(input: FirstRunPricingInput) {
  if (!input.region.trim()) throw new Error("Business region is required.");
  if (input.region.trim().length > 120) throw new Error("Business region must be 120 characters or fewer.");
  if (![input.minimumCharge, input.averageDumpFee].every(Number.isFinite) || input.minimumCharge < 0 || input.averageDumpFee < 0) {
    throw new Error("Minimum charge and dump fees must be zero or greater.");
  }
  if (!Number.isInteger(input.averageCrewSize) || input.averageCrewSize < 1 || input.averageCrewSize > 25) {
    throw new Error("Average crew size must be between 1 and 25.");
  }
  normalizePricingMarket(input.pricingMarket);
}

async function replaceLibrary(
  tx: Prisma.TransactionClient,
  companyId: string,
  options: StandardLibraryResetOptions,
) {
  const items = buildStandardItemLibrary(options.multiplier ?? 1);
  const preserved = options.clearOverrides
    ? []
    : await tx.pricingProfileItemOverride.findMany({
        where: { pricingProfile: { companyId } },
        select: {
          pricingProfileId: true,
          basePrice: true,
          disposalFee: true,
          laborHours: true,
          crewRequirement: true,
          itemLibrary: { select: { category: true, name: true } },
        },
      });

  await tx.itemLibrary.deleteMany({ where: { companyId } });
  await tx.itemLibrary.createMany({
    data: items.map((value) => ({
      companyId,
      id: standardItemId(companyId, value),
      ...value,
      estimateRequired: value.estimateRequired ?? false,
    })),
  });

  if (preserved.length) {
    const standardKeys = new Map(
      items.map((value) => [`${value.category}\u0000${value.name}`.toLowerCase(), standardItemId(companyId, value)]),
    );
    const restorable = preserved.flatMap(({ itemLibrary, ...override }) => {
      const itemLibraryId = standardKeys.get(`${itemLibrary.category}\u0000${itemLibrary.name}`.toLowerCase());
      return itemLibraryId ? [{ ...override, itemLibraryId }] : [];
    });
    if (restorable.length) await tx.pricingProfileItemOverride.createMany({ data: restorable });
  }
  return { itemCount: items.length, overrideCount: preserved.length };
}

export async function resetToStandardLibrary(
  companyId: string,
  actingUserId: string,
  options: StandardLibraryResetOptions = {},
) {
  return prisma.$transaction(async (tx) => {
    const result = await replaceLibrary(tx, companyId, options);
    await tx.companySettings.upsert({
      where: { companyId },
      create: { companyId, standardLibraryVersion: STANDARD_LIBRARY_VERSION },
      update: { standardLibraryVersion: STANDARD_LIBRARY_VERSION },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "Item Library Reset to JunkQuote Standard",
        entityType: "ItemLibrary",
        metadata: {
          version: STANDARD_LIBRARY_VERSION,
          itemCount: result.itemCount,
          clearOverrides: options.clearOverrides ?? false,
        },
      },
    });
    return result;
  });
}

export async function applyFirstRunPricingLibrary(
  companyId: string,
  actingUserId: string,
  input: FirstRunPricingInput,
) {
  validateFirstRunPricing(input);
  const market = normalizePricingMarket(input.pricingMarket);
  const multiplier = PRICING_MARKETS[market].multiplier;
  return prisma.$transaction(async (tx) => {
    const state = await tx.companyOnboarding.findUnique({ where: { companyId }, select: { completedSections: true } });
    const settings = await tx.companySettings.findUnique({ where: { companyId }, select: { standardLibraryInitializedAt: true } });
    if (state?.completedSections.includes("pricing") || settings?.standardLibraryInitializedAt) {
      throw new Error("The first-run pricing library has already been initialized. Use the explicit reset action to replace it.");
    }
    const result = await replaceLibrary(tx, companyId, { multiplier, clearOverrides: true });
    await tx.company.update({ where: { id: companyId }, data: { defaultMinimumCharge: input.minimumCharge } });
    await tx.companySettings.upsert({
      where: { companyId },
      create: {
        companyId,
        defaultDumpFee: input.averageDumpFee,
        pricingRegion: input.region.trim(),
        pricingMarket: market,
        standardLibraryVersion: STANDARD_LIBRARY_VERSION,
        standardLibraryInitializedAt: new Date(),
      },
      update: {
        defaultDumpFee: input.averageDumpFee,
        pricingRegion: input.region.trim(),
        pricingMarket: market,
        standardLibraryVersion: STANDARD_LIBRARY_VERSION,
        standardLibraryInitializedAt: new Date(),
      },
    });
    await tx.pricingProfile.updateMany({
      where: { companyId, defaultProfile: true },
      data: {
        minimumCharge: input.minimumCharge,
        dumpFee: input.averageDumpFee,
        defaultCrewSize: input.averageCrewSize,
      },
    });
    await tx.auditEvent.create({
      data: {
        companyId,
        actingUserId,
        eventType: "JunkQuote Standard Library Initialized",
        entityType: "ItemLibrary",
        metadata: { region: input.region.trim(), market, multiplier, itemCount: result.itemCount },
      },
    });
    return { ...result, market, multiplier };
  });
}
