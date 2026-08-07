import type { BillingInterval, SubscriptionPlan } from "@/generated/prisma/client";

export type BillingFeature =
  | "approvals" | "pdfEstimates" | "dashboard" | "scheduling" | "invoicing"
  | "payments" | "reporting" | "advancedReporting" | "operations"
  | "prioritySupport" | "finance" | "taxCenter" | "timekeeping"
  | "fleet" | "pricingIntelligence" | "automation" | "advancedExports"
  | "onlinePayments";

export const billingConfig = { trialDays: 30, pastDueGraceDays: Number(process.env.BILLING_GRACE_DAYS ?? 7) } as const;
const unlimited = Number.MAX_SAFE_INTEGER;
const core: BillingFeature[] = ["approvals", "pdfEstimates", "dashboard"];

export const plans: Record<SubscriptionPlan, {
  name: string; description: string; monthlyCents: number; yearlyCents: number;
  userLimit: number; monthlyEstimateLimit: number; storageBytes: number;
  crewLimit: number; truckLimit: number; features: BillingFeature[];
}> = {
  Free: { name: "Free", description: "Core estimating for one company owner.", monthlyCents: 0, yearlyCents: 0, userLimit: 1, monthlyEstimateLimit: 6, storageBytes: 2e9, crewLimit: 0, truckLimit: 1, features: core },
  Starter: { name: "Starter", description: "Core estimating and customer workflows.", monthlyCents: 3900, yearlyCents: 39000, userLimit: 3, monthlyEstimateLimit: 50, storageBytes: 10e9, crewLimit: 1, truckLimit: 3, features: [...core, "scheduling", "invoicing", "onlinePayments"] },
  Professional: { name: "Professional", description: "Complete operations for growing teams.", monthlyCents: 8900, yearlyCents: 89000, userLimit: 10, monthlyEstimateLimit: unlimited, storageBytes: 25e9, crewLimit: 5, truckLimit: 10, features: [...core, "scheduling", "invoicing", "payments", "onlinePayments", "reporting", "operations", "finance", "timekeeping", "fleet", "pricingIntelligence", "automation", "advancedExports"] },
  Enterprise: { name: "Enterprise", description: "Advanced controls and scale for established operators.", monthlyCents: 14900, yearlyCents: 149000, userLimit: 50, monthlyEstimateLimit: unlimited, storageBytes: 100e9, crewLimit: 25, truckLimit: 50, features: [...core, "scheduling", "invoicing", "payments", "onlinePayments", "reporting", "advancedReporting", "operations", "prioritySupport", "finance", "taxCenter", "timekeeping", "fleet", "pricingIntelligence", "automation", "advancedExports"] },
};

const priceEnvironmentNames: Record<Exclude<SubscriptionPlan, "Free">, Record<BillingInterval, string>> = {
  Starter: { Monthly: "STRIPE_PRICE_STARTER_MONTHLY", Yearly: "STRIPE_PRICE_STARTER_YEARLY" },
  Professional: { Monthly: "STRIPE_PRICE_PROFESSIONAL_MONTHLY", Yearly: "STRIPE_PRICE_PROFESSIONAL_YEARLY" },
  Enterprise: { Monthly: "STRIPE_PRICE_ENTERPRISE_MONTHLY", Yearly: "STRIPE_PRICE_ENTERPRISE_YEARLY" },
};

export function priceIdFor(plan: SubscriptionPlan, interval: BillingInterval, env: NodeJS.ProcessEnv = process.env) {
  if (plan === "Free") return null;
  return env[priceEnvironmentNames[plan][interval]]?.trim() || null;
}
export function catalogEntryForPriceId(priceId: string, env: NodeJS.ProcessEnv = process.env) {
  for (const plan of ["Starter", "Professional", "Enterprise"] as const)
    for (const interval of ["Monthly", "Yearly"] as const)
      if (priceIdFor(plan, interval, env) === priceId) return { plan, interval };
  return null;
}
