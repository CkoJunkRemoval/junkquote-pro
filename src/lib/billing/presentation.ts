import type { BillingFeature } from "./config";
import type { CompanySubscription } from "@/generated/prisma/client";

export const billingFeatureLabels: Record<BillingFeature, string> = {
  approvals: "Customer approvals",
  pdfEstimates: "PDF estimates",
  dashboard: "Dashboard",
  scheduling: "Scheduling",
  invoicing: "Invoicing",
  payments: "Payments",
  reporting: "Reporting",
  advancedReporting: "Advanced reporting",
  operations: "Operations",
  prioritySupport: "Priority support",
  finance: "Finance",
  taxCenter: "Tax Center",
  timekeeping: "Timekeeping",
  fleet: "Fleet",
  pricingIntelligence: "Pricing Intelligence",
  automation: "Automation",
  advancedExports: "Advanced exports",
};

export function billingFeatureLabel(feature: BillingFeature) {
  return billingFeatureLabels[feature];
}

type DisplaySubscription = Pick<CompanySubscription,
  "status" | "trialStatus" | "trialEnd" | "stripeCustomerId" |
  "stripeSubscriptionId" | "cancelAtPeriodEnd"
>;

export function billingStatusLabel(
  subscription: DisplaySubscription | null,
  reason: "paid" | "grace" | "trial" | "free",
  now = new Date(),
) {
  if (subscription?.cancelAtPeriodEnd) return "Cancellation scheduled";
  if (
    reason === "trial" && subscription?.trialStatus === "Active" &&
    subscription.trialEnd && subscription.trialEnd > now &&
    !subscription.stripeCustomerId && !subscription.stripeSubscriptionId
  ) return "Trial active";
  if (reason === "free" && !subscription?.stripeSubscriptionId) return "Free";
  switch (subscription?.status) {
    case "Trialing": return "Trial active";
    case "Active": return "Active";
    case "PastDue": return "Past due";
    case "Canceled": return "Canceled";
    case "Incomplete": return "Incomplete";
    case "Unpaid": return "Unpaid";
    case "Paused": return "Paused";
    default: return "Free";
  }
}
