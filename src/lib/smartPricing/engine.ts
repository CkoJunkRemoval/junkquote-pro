export interface PricingObservation {
  finalQuotedPrice: number;
  finalCollectedPrice?: number;
  quantity: number;
  laborHours: number | null;
  disposalCost: number;
  createdAt: Date;
  collectedPrice?: number;
  grossMarginPercent?: number | null;
  completenessScore?: number;
  classification?: string;
  weight?: number;
}

export interface RecommendationInput {
  items: Array<{ item: string; quantity: number }>;
  propertyType?: string;
  jobSize?: number;
  location?: string;
  laborEstimate?: number;
}

export interface PricingRecommendation {
  recommendedPrice: number;
  confidenceScore: number;
  historicalSampleSize: number;
  averagePrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  recentTrend: "rising" | "stable" | "falling" | "insufficient-data";
  seasonalAdjustment: number;
  explanation: string[];
  quotedPriceHistoricalAverage: number;
  collectedPriceHistoricalAverage: number;
  grossMarginHistoricalAverage: number | null;
  averagePricingError: number;
  underbidFrequency: number;
  overbidFrequency: number;
  completeRecordSampleSize: number;
  partialRecordSampleSize: number;
}

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
const weightedAverage = (rows: PricingObservation[], pick: (row: PricingObservation) => number) => { const total = rows.reduce((sum, row) => sum + (row.weight ?? 1), 0); return total ? rows.reduce((sum, row) => sum + pick(row) * (row.weight ?? 1), 0) / total : 0; };
const weightedMedian = (rows: PricingObservation[]) => { if (!rows.length) return 0; const sorted = [...rows].sort((a,b) => a.finalQuotedPrice - b.finalQuotedPrice); const half = sorted.reduce((sum,row) => sum + (row.weight ?? 1), 0) / 2; let seen = 0; for (let index = 0; index < sorted.length; index++) { const row = sorted[index]; seen += row.weight ?? 1; if (seen === half && sorted[index + 1]) return (row.finalQuotedPrice + sorted[index + 1].finalQuotedPrice) / 2; if (seen > half) return row.finalQuotedPrice; } return sorted.at(-1)!.finalQuotedPrice; };

export function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function calculateConfidence(observations: PricingObservation[], minimumSampleSize = 5) {
  if (!observations.length) return 0;
  const prices = observations.map((row) => row.finalQuotedPrice).filter((price) => price >= 0);
  if (!prices.length) return 0;
  const mean = average(prices);
  const variance = average(prices.map((price) => (price - mean) ** 2));
  const consistency = mean === 0 ? (variance === 0 ? 1 : 0) : Math.max(0, 1 - Math.sqrt(variance) / mean);
  const volume = Math.min(1, observations.length / Math.max(1, minimumSampleSize * 3));
  return Math.round(Math.min(100, volume * 60 + consistency * 40) * 100) / 100;
}

export function recommendPrice(observations: PricingObservation[], input: RecommendationInput, minimumSampleSize = 5): PricingRecommendation {
  const valid = observations.filter((row) => Number.isFinite(row.finalQuotedPrice) && row.finalQuotedPrice >= 0);
  const prices = valid.map((row) => row.finalQuotedPrice);
  const avg = weightedAverage(valid, (row) => row.finalQuotedPrice);
  const med = weightedMedian(valid);
  const recent = [...valid].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, Math.max(3, Math.ceil(valid.length / 3)));
  const older = [...valid].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(recent.length);
  const recentAverage = average(recent.map((row) => row.finalQuotedPrice));
  const olderAverage = average(older.map((row) => row.finalQuotedPrice));
  const delta = olderAverage ? (recentAverage - olderAverage) / olderAverage : 0;
  const trend = valid.length < 6 ? "insufficient-data" : delta > 0.05 ? "rising" : delta < -0.05 ? "falling" : "stable";
  const quantity = Math.max(1, input.items.reduce((sum, item) => sum + Math.max(0, item.quantity), 0));
  const historicalQuantity = average(valid.map((row) => Math.max(1, row.quantity))) || quantity;
  const sizeFactor = Math.min(3, Math.max(0.25, quantity / historicalQuantity));
  const recommended = valid.length ? med * sizeFactor : 0;
  const complete = valid.filter((row) => (row.completenessScore ?? 100) === 100);
  const partial = valid.filter((row) => (row.completenessScore ?? 100) < 100);
  const collected = valid.map((row) => row.collectedPrice).filter((value): value is number => value !== undefined);
  const margins = valid.map((row) => row.grossMarginPercent).filter((value): value is number => value !== null && value !== undefined);
  const errors = valid.map((row) => Math.abs((row.collectedPrice ?? row.finalQuotedPrice) - row.finalQuotedPrice));
  const underbid = valid.filter((row) => row.classification === "underbid").length;
  const overbid = valid.filter((row) => row.classification === "overbid").length;
  return {
    recommendedPrice: roundMoney(recommended), confidenceScore: calculateConfidence(valid, minimumSampleSize),
    historicalSampleSize: valid.length, averagePrice: roundMoney(avg), medianPrice: roundMoney(med),
    minPrice: valid.length ? Math.min(...prices) : 0, maxPrice: valid.length ? Math.max(...prices) : 0,
    recentTrend: trend, seasonalAdjustment: 0,
    explanation: valid.length ? [
      `${valid.length} similar ${valid.length === 1 ? "job" : "jobs"}`,
      `Based on ${complete.length} completed jobs with full cost data and ${partial.length} partial records`,
      `Similar jobs were underbid ${roundMoney(underbid / valid.length * 100)}% of the time`,
      ...(margins.length ? [`Average gross margin was ${roundMoney(average(margins))}%`] : []),
      `Collected totals averaged $${roundMoney(Math.abs(average(collected) - avg))} ${average(collected) < avg ? "below" : "above"} quoted totals`,
      `Average labor ${roundMoney(average(valid.flatMap((row) => row.laborHours === null ? [] : [row.laborHours])))} hours`,
      `Average disposal $${roundMoney(average(valid.map((row) => row.disposalCost)))}`,
      `Average final price $${roundMoney(avg)}`,
    ] : ["No financially usable completed jobs yet"],
    quotedPriceHistoricalAverage: roundMoney(avg), collectedPriceHistoricalAverage: roundMoney(average(collected)),
    grossMarginHistoricalAverage: margins.length ? roundMoney(average(margins)) : null, averagePricingError: roundMoney(average(errors)),
    underbidFrequency: valid.length ? roundMoney(underbid / valid.length * 100) : 0, overbidFrequency: valid.length ? roundMoney(overbid / valid.length * 100) : 0,
    completeRecordSampleSize: complete.length, partialRecordSampleSize: partial.length,
  };
}
