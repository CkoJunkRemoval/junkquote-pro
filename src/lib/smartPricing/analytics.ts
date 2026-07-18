import { prisma } from "@/lib/prisma";
import { classifyPriceVariance } from "./variance";

export async function getPricingAnalytics(companyId: string) {
  const [history, decisions] = await Promise.all([
    prisma.pricingHistory.findMany({ where: { companyId }, select: { item: true, finalQuotedPrice: true, finalCollectedPrice: true, discount: true, profitEstimate: true } }),
    prisma.smartPricingDecision.findMany({ where: { companyId }, select: { accepted: true } }),
  ]);
  const byItem = new Map<string, { profit: number; revenue: number; count: number }>();
  for (const row of history) { const value = byItem.get(row.item) ?? { profit: 0, revenue: 0, count: 0 }; value.profit += row.profitEstimate; value.revenue += row.finalCollectedPrice; value.count++; byItem.set(row.item, value); }
  const categories = [...byItem].map(([item, value]) => ({ item, ...value, averageProfit: value.profit / value.count })).sort((a, b) => b.averageProfit - a.averageProfit);
  const sum = (pick: (row: typeof history[number]) => number) => history.reduce((total, row) => total + pick(row), 0);
  const quoted = sum((row) => row.finalQuotedPrice); const collected = sum((row) => row.finalCollectedPrice);
  const varianceCounts = history.flatMap((row) => classifyPriceVariance(row.finalQuotedPrice, row.finalCollectedPrice, row.finalCollectedPrice, row.profitEstimate)).reduce<Record<string, number>>((counts, flag) => ({ ...counts, [flag]: (counts[flag] ?? 0) + 1 }), {});
  return { mostProfitableItems: categories.slice(0, 5), leastProfitableItems: [...categories].reverse().slice(0, 5), topPerformingEstimateCategories: categories.slice(0, 5), varianceCounts,
    averageEstimateAccuracy: quoted ? Math.max(0, 100 - Math.abs(collected - quoted) / quoted * 100) : 0,
    acceptanceRate: decisions.length ? decisions.filter((row) => row.accepted).length / decisions.length * 100 : 0,
    averageDiscount: history.length ? sum((row) => row.discount) / history.length : 0, revenueVsQuoted: { quoted, collected }, sampleSize: history.length };
}

export type AccuracyFilters = { from?: Date; to?: Date; estimatorId?: string; category?: string; propertyType?: string; crewId?: string };
export async function getSmartPricingAccuracy(companyId: string, filters: AccuracyFilters = {}) {
  if (filters.estimatorId && !await prisma.user.findFirst({ where: { id: filters.estimatorId, companyId, memberships: { some: { companyId, status: "Active" } } }, select: { id: true } })) throw new Error("Estimator filter is not available for this company.");
  if (filters.crewId && !await prisma.crew.findFirst({ where: { id: filters.crewId, companyId }, select: { id: true } })) throw new Error("Crew filter is not available for this company.");
  const estimateFilter = { companyId, ...(filters.category ? { jobSites: { some: { items: { some: { category: filters.category } } } } } : {}), ...(filters.estimatorId ? { smartPricingDecision: { actingUserId: filters.estimatorId, companyId } } : {}) };
  const outcomes = await prisma.pricingOutcome.findMany({ where: { companyId, completedAt: { gte: filters.from, lte: filters.to }, ...(filters.propertyType ? { propertyType: filters.propertyType } : {}), job: { companyId,
    ...(filters.crewId ? { assignments: { some: { companyId, crewId: filters.crewId } } } : {}), estimate: estimateFilter } },
    select: { quotedAmount: true, collectedAmount: true, refundAmount: true, grossMarginPercent: true, estimateVarianceAmount: true, classification: true, completenessScore: true } });
  const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  const decisions = await prisma.smartPricingDecision.findMany({ where: { companyId, decidedAt: { gte: filters.from, lte: filters.to } }, select: { decision: true } });
  return { sampleSize: outcomes.length, averageAbsoluteEstimateError: avg(outcomes.map((row) => Math.abs(row.estimateVarianceAmount ?? 0))), averageQuotedToCollectedVariance: avg(outcomes.map((row) => row.collectedAmount - row.quotedAmount)),
    underbidRate: outcomes.length ? outcomes.filter((row) => row.classification === "underbid").length / outcomes.length * 100 : 0, overbidRate: outcomes.length ? outcomes.filter((row) => row.classification === "overbid").length / outcomes.length * 100 : 0,
    averageGrossMargin: avg(outcomes.flatMap((row) => row.grossMarginPercent === null ? [] : [row.grossMarginPercent])), lowMarginJobCount: outcomes.filter((row) => row.grossMarginPercent !== null && row.grossMarginPercent < 15).length,
    highRefundJobCount: outcomes.filter((row) => row.refundAmount > row.quotedAmount * .1).length, incompleteOutcomeCount: outcomes.filter((row) => row.completenessScore < 100).length,
    recommendationAcceptancePerformance: decisions.length ? decisions.filter((row) => row.decision === "Accepted").length / decisions.length * 100 : 0 };
}

export async function getSmartPricingFilterOptions(companyId: string) {
  const [estimators, crews, categories, propertyTypes] = await Promise.all([
    prisma.user.findMany({ where: { companyId, active: true, memberships: { some: { companyId, status: "Active", role: { in: ["Owner", "Admin", "Manager"] } } } }, select: { id: true, firstName: true, lastName: true, email: true }, orderBy: { email: "asc" } }),
    prisma.crew.findMany({ where: { companyId, active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.estimateItem.findMany({ where: { jobSite: { estimate: { companyId } } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
    prisma.property.findMany({ where: { customer: { companyId }, propertyType: { not: null } }, distinct: ["propertyType"], select: { propertyType: true }, orderBy: { propertyType: "asc" } }),
  ]);
  return { estimators, crews, categories: categories.map((row) => row.category), propertyTypes: propertyTypes.flatMap((row) => row.propertyType ? [row.propertyType] : []) };
}
