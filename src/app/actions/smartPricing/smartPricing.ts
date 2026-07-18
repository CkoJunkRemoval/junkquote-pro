"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { getSmartPricingRecommendation, saveSmartPricingDecision } from "@/lib/smartPricing/service";
import type { RecommendationInput } from "@/lib/smartPricing/engine";

export async function getSmartPricingRecommendationAction(input: RecommendationInput) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getSmartPricingRecommendation(companyId, input);
}
export async function saveSmartPricingDecisionAction(estimateId: string, data: Parameters<typeof saveSmartPricingDecision>[3]) {
  const { companyId, user } = await requireCompanyRole("Owner", "Admin", "Manager");
  return saveSmartPricingDecision(companyId, estimateId, user.id, data);
}
