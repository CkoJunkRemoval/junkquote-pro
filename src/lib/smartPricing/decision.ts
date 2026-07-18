export function createDecisionSnapshot(data: { recommendedPrice: number; manualPrice: number; appliedPrice?: number; accepted?: boolean }, decidedAt = new Date()) {
  const finalQuotedAmount = data.appliedPrice ?? data.manualPrice;
  const decision = data.accepted === true ? "Accepted" as const : data.appliedPrice !== undefined ? "PartiallyAdjusted" as const : data.accepted === false ? "Ignored" as const : "Unavailable" as const;
  return { decision, finalQuotedAmount, difference: finalQuotedAmount - data.recommendedPrice, decidedAt };
}
