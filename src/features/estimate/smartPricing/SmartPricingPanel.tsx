"use client";
import { useEffect, useMemo, useState } from "react";
import { getSmartPricingRecommendationAction, saveSmartPricingDecisionAction } from "@/app/actions/smartPricing/smartPricing";
import { useEstimate } from "../EstimateContext";
import type { PricingRecommendation } from "@/lib/smartPricing/engine";

export default function SmartPricingPanel() {
  const { estimate, estimateId, updatePricing } = useEstimate();
  const [recommendation, setRecommendation] = useState<PricingRecommendation | null>(null);
  const [loading, setLoading] = useState(true);
  const [override, setOverride] = useState("");
  const request = useMemo(() => ({ items: estimate.jobSites.flatMap((site) => site.items.map((item) => ({ item: item.name, quantity: item.quantity }))), propertyType: estimate.property.type || undefined, jobSize: estimate.pricing.subtotal, laborEstimate: estimate.pricing.labor }), [estimate.jobSites, estimate.property.type, estimate.pricing.subtotal, estimate.pricing.labor]);
  useEffect(() => { void getSmartPricingRecommendationAction(request).then(setRecommendation).finally(() => setLoading(false)); }, [request]);
  if (loading) return <section className="rounded-xl border bg-slate-50 p-4">Checking company pricing history…</section>;
  if (!recommendation) return null;
  const manual = estimate.pricing.total;
  async function apply(price: number) {
    updatePricing({ ...estimate.pricing, total: price });
    if (estimateId) await saveSmartPricingDecisionAction(estimateId, { recommendedPrice: recommendation!.recommendedPrice, confidenceScore: recommendation!.confidenceScore, historicalSampleSize: recommendation!.historicalSampleSize, manualPrice: manual, appliedPrice: price, accepted: price === recommendation!.recommendedPrice });
  }
  return <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-semibold text-blue-700">SMART PRICING</p><h2 className="text-xl font-bold">Suggested price ${recommendation.recommendedPrice.toFixed(2)}</h2><p className="text-sm text-slate-600">Current manual price ${manual.toFixed(2)} · Difference ${(recommendation.recommendedPrice - manual).toFixed(2)}</p></div><div className="text-right"><p className="font-semibold">{recommendation.confidenceScore}% confidence</p><p className="text-sm text-slate-600">{recommendation.historicalSampleSize} historical samples</p></div></div><div className="mt-4"><p className="font-semibold">Suggested because…</p><ul className="mt-1 list-disc pl-5 text-sm text-slate-700">{recommendation.explanation.map((line) => <li key={line}>{line}</li>)}</ul></div><div className="mt-4 flex flex-wrap gap-2"><button className="rounded bg-blue-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => void apply(recommendation.recommendedPrice)}>Accept suggestion</button><button className="rounded border bg-white px-3 py-2 text-sm" onClick={() => estimateId && void saveSmartPricingDecisionAction(estimateId, { recommendedPrice: recommendation.recommendedPrice, confidenceScore: recommendation.confidenceScore, historicalSampleSize: recommendation.historicalSampleSize, manualPrice: manual, accepted: false })}>Keep manual price</button><input aria-label="Partial override price" className="w-32 rounded border px-2" type="number" min="0" value={override} onChange={(event) => setOverride(event.target.value)} placeholder="Override"/><button className="rounded border bg-white px-3 py-2 text-sm" disabled={!Number.isFinite(Number(override)) || Number(override) < 0} onClick={() => void apply(Number(override))}>Apply override</button></div><p className="mt-3 text-xs text-slate-500">Smart Pricing never changes the estimate unless you choose an option.</p></section>;
}
