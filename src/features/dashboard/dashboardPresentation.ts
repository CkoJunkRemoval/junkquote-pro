type PricingAnalyticsSummary = {
  sampleSize: number;
  decisionCount: number;
  averageEstimateAccuracy: number;
  acceptanceRate: number;
  averageDiscount: number;
  revenueVsQuoted: { quoted: number; collected: number };
  mostProfitableItems: Array<{ item: string; averageProfit: number }>;
};

export function dashboardPerformanceContent(
  analytics: PricingAnalyticsSummary,
) {
  const hasCompletedEstimates = analytics.sampleSize > 0;
  return {
    estimateAccuracy: hasCompletedEstimates
      ? `${analytics.averageEstimateAccuracy.toFixed(1)}%`
      : "No completed estimates yet",
    suggestionAcceptance:
      analytics.decisionCount > 0
        ? `${analytics.acceptanceRate.toFixed(1)}%`
        : "No pricing suggestions reviewed yet",
    averageDiscount: hasCompletedEstimates
      ? `$${analytics.averageDiscount.toFixed(2)}`
      : "No completed estimates yet",
    revenueVsQuoted: hasCompletedEstimates
      ? `$${analytics.revenueVsQuoted.collected.toFixed(0)} / $${analytics.revenueVsQuoted.quoted.toFixed(0)}`
      : "No completed revenue data yet",
    mostProfitableItems:
      analytics.mostProfitableItems
        .map((row) => `${row.item} ($${row.averageProfit.toFixed(0)})`)
        .join(", ") || "Complete jobs to populate analytics",
  };
}
