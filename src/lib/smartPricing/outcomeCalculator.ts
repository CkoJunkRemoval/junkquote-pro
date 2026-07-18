export interface PricingOutcomeInput {
  quotedAmount: number; invoicedAmount: number | null; collectedAmount: number; refundAmount: number; discountAmount: number;
  laborHoursEstimated: number | null; laborHoursActual: number | null; laborCostEstimated: number | null; laborCostActual: number | null;
  disposalCostEstimated: number | null; disposalCostActual: number | null; travelCostEstimated: number | null; travelCostActual: number | null;
  otherCostActual: number | null;
}
export type OutcomeClassification = "underbid" | "overbid" | "on-target" | "unavailable";
export type CollectionStatus = "not-invoiced" | "unpaid" | "partially-collected" | "collected" | "over-collected";
export function calculatePricingOutcome(input: PricingOutcomeInput) {
  const missingData: string[] = [];
  if (input.invoicedAmount === null) missingData.push("invoicedAmount");
  if (input.laborHoursEstimated === null) missingData.push("laborHoursEstimated");
  if (input.laborCostEstimated === null) missingData.push("laborCostEstimated");
  if (input.laborHoursActual === null) missingData.push("laborHoursActual");
  if (input.laborCostActual === null) missingData.push("laborCostActual");
  if (input.disposalCostActual === null) missingData.push("disposalCostActual");
  if (input.travelCostActual === null) missingData.push("travelCostActual");
  if (input.otherCostActual === null) missingData.push("otherCostActual");
  const estimatedCosts = [input.laborCostEstimated, input.disposalCostEstimated, input.travelCostEstimated];
  const actualCosts = [input.laborCostActual, input.disposalCostActual, input.travelCostActual, input.otherCostActual];
  const estimatedCostTotal = estimatedCosts.every((value) => value !== null) ? estimatedCosts.reduce<number>((sum, value) => sum + value!, 0) : null;
  const actualCostTotal = actualCosts.every((value) => value !== null) ? actualCosts.reduce<number>((sum, value) => sum + value!, 0) : null;
  const netCollected = Math.max(0, input.collectedAmount - input.refundAmount);
  const estimateVarianceAmount = input.invoicedAmount === null ? null : input.invoicedAmount - input.quotedAmount;
  const estimateVariancePercent = estimateVarianceAmount === null || input.quotedAmount === 0 ? null : estimateVarianceAmount / input.quotedAmount * 100;
  const collectedVarianceAmount = netCollected - input.quotedAmount;
  const collectedVariancePercent = input.quotedAmount === 0 ? null : collectedVarianceAmount / input.quotedAmount * 100;
  const costVarianceAmount = estimatedCostTotal === null || actualCostTotal === null ? null : actualCostTotal - estimatedCostTotal;
  const grossProfit = actualCostTotal === null ? null : netCollected - actualCostTotal;
  const grossMarginPercent = grossProfit === null || netCollected <= 0 ? null : grossProfit / netCollected * 100;
  const classification: OutcomeClassification = estimateVariancePercent === null ? "unavailable" : estimateVariancePercent > 5 ? "underbid" : estimateVariancePercent < -5 ? "overbid" : "on-target";
  const collectionStatus: CollectionStatus = input.invoicedAmount === null ? "not-invoiced" : netCollected === 0 ? "unpaid" : netCollected < input.invoicedAmount ? "partially-collected" : netCollected === input.invoicedAmount ? "collected" : "over-collected";
  return { netCollected, estimateVarianceAmount, estimateVariancePercent, collectedVarianceAmount, collectedVariancePercent, estimatedCostTotal, actualCostTotal, costVarianceAmount, grossProfit, grossMarginPercent, classification, collectionStatus, missingData, completenessScore: Math.round((8 - missingData.length) / 8 * 100) };
}
