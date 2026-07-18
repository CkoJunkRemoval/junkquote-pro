import { prisma } from "@/lib/prisma";
import { recommendPrice, type RecommendationInput } from "./engine";
import { createDecisionSnapshot } from "./decision";

export async function getSmartPricingRecommendation(companyId: string, input: RecommendationInput) {
  const settings = await prisma.companySettings.findUnique({ where: { companyId } });
  if (!settings?.smartPricingEnabled) return null;
  const rows = await prisma.pricingOutcome.findMany({
    where: { companyId, collectionStatus: { not: "not-invoiced" } }, orderBy: { completedAt: "desc" }, take: 1000,
    select: { quotedAmount: true, collectedAmount: true, laborHoursActual: true, laborHoursEstimated: true, disposalCostActual: true, disposalCostEstimated: true, completedAt: true, grossMarginPercent: true, completenessScore: true, classification: true },
  });
  const weighted = rows.flatMap((row) => { const ageDays = Math.max(0, (Date.now() - row.completedAt.getTime()) / 86400000); const recency = ageDays <= 90 ? 2 : 1; const completeness = row.completenessScore === 100 ? 2 : row.completenessScore >= 50 ? 1 : 0; return completeness === 0 ? [] : [{ finalQuotedPrice: row.quotedAmount, collectedPrice: row.collectedAmount, quantity: 1, laborHours: row.laborHoursActual ?? row.laborHoursEstimated, disposalCost: row.disposalCostActual ?? row.disposalCostEstimated ?? 0, createdAt: row.completedAt, grossMarginPercent: row.grossMarginPercent, completenessScore: row.completenessScore, classification: row.classification, weight: recency + completeness }]; });
  return recommendPrice(weighted, input, settings.smartPricingMinimumSampleSize);
}

export async function saveSmartPricingDecision(companyId: string, estimateId: string, actingUserId: string, data: { recommendedPrice: number; confidenceScore: number; historicalSampleSize: number; manualPrice: number; appliedPrice?: number; accepted?: boolean }) {
  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, select: { id: true } });
  if (!estimate) throw new Error("Estimate not found.");
  const snapshot = createDecisionSnapshot(data);
  return prisma.smartPricingDecision.upsert({ where: { estimateId }, create: { companyId, estimateId, ...data, ...snapshot, actingUserId }, update: {} });
}
