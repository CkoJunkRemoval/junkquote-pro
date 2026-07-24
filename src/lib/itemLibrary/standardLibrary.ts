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

type ExistingLibraryItem = {
  id: string;
  category: string;
  name: string;
  active: boolean;
  basePrice: number;
  disposalFee: number;
  laborHours: number;
  weightClass: string;
  estimatedVolume: number;
  estimateRequired: boolean;
};

const libraryKey = (item: Pick<ExistingLibraryItem, "category" | "name">) =>
  `${item.category}\u0000${item.name}`.toLowerCase();

export function calculateStandardLibraryPlan(existing: ExistingLibraryItem[], multiplier = 1) {
  const standard = buildStandardItemLibrary(multiplier);
  const existingByKey = new Map<string, ExistingLibraryItem>();
  for (const row of existing) {
    const key = libraryKey(row);
    const selected = existingByKey.get(key);
    if (!selected || (!selected.active && row.active)) existingByKey.set(key, row);
  }
  const standardKeys = new Set(standard.map(libraryKey));
  const updated = standard.filter((next) => {
    const current = existingByKey.get(libraryKey(next));
    return current && (
      !current.active ||
      current.basePrice !== next.basePrice ||
      current.disposalFee !== next.disposalFee ||
      current.laborHours !== next.laborHours ||
      current.weightClass !== next.weightClass ||
      current.estimatedVolume !== next.estimatedVolume ||
      current.estimateRequired !== Boolean(next.estimateRequired)
    );
  }).length;
  return {
    updated,
    created: standard.filter((next) => !existingByKey.has(libraryKey(next))).length,
    archived: existing.filter((row) => row.active && !standardKeys.has(libraryKey(row))).length,
    total: standard.length,
  };
}

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
  const existing = await tx.itemLibrary.findMany({ where: { companyId }, orderBy: { createdAt: "asc" } });
  const plan = calculateStandardLibraryPlan(existing, options.multiplier ?? 1);
  const existingByKey = new Map<string, (typeof existing)[number]>();
  for (const row of existing) {
    const key = libraryKey(row);
    const selected = existingByKey.get(key);
    if (!selected || (!selected.active && row.active)) existingByKey.set(key, row);
  }

  if (options.clearOverrides) {
    await tx.pricingProfileItemOverride.deleteMany({ where: { pricingProfile: { companyId } } });
  }
  await tx.itemLibrary.updateMany({ where: { companyId, active: true }, data: { active: false } });
  for (const value of items) {
    const current = existingByKey.get(libraryKey(value));
    const next = { ...value, active: true, estimateRequired: value.estimateRequired ?? false };
    if (current) await tx.itemLibrary.update({ where: { id: current.id }, data: next });
    else await tx.itemLibrary.create({ data: { companyId, id: standardItemId(companyId, value), ...next } });
  }
  return { itemCount: items.length, ...plan };
}

export async function previewStandardLibrary(companyId: string) {
  const existing = await prisma.itemLibrary.findMany({
    where: { companyId },
    select: {
      id: true, category: true, name: true, active: true, basePrice: true,
      disposalFee: true, laborHours: true, weightClass: true, estimatedVolume: true,
      estimateRequired: true,
    },
  });
  return calculateStandardLibraryPlan(existing);
}

export async function applyStandardLibrary(
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
          updated: result.updated,
          created: result.created,
          archived: result.archived,
        },
      },
    });
    return result;
  });
}

export const resetToStandardLibrary = applyStandardLibrary;

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
