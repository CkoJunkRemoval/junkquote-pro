import { prisma } from "@/lib/prisma";
import { plans, type BillingFeature } from "./config";
import type { CompanySubscription, SubscriptionPlan } from "@/generated/prisma/client";

export class BillingAccessError extends Error {
  constructor(message: string, public code: "RESTRICTED" | "PLAN_LIMIT" | "FEATURE_UNAVAILABLE" = "RESTRICTED") { super(message); this.name = "BillingAccessError"; }
}
type BillingState = Pick<CompanySubscription, "plan" | "status" | "trialEnd" | "trialPlan" | "trialStatus" | "gracePeriodEnd" | "currentPeriodEnd" | "lastSuccessfulPaymentAt">;

export function resolveEffectivePlan(subscription: BillingState | null, now = new Date()) {
  const paid = Boolean(subscription && (
    subscription.status === "Active" ||
    (subscription.status === "PastDue" && subscription.gracePeriodEnd && subscription.gracePeriodEnd > now)
  ) && subscription.lastSuccessfulPaymentAt);
  const trial = Boolean(subscription?.trialStatus === "Active" && subscription.trialEnd && subscription.trialEnd > now);
  const plan: SubscriptionPlan = paid ? subscription!.plan : trial ? (subscription!.trialPlan ?? "Professional") : "Free";
  const reason = paid ? (subscription!.status === "PastDue" ? "grace" : "paid") : trial ? "trial" : "free";
  return { plan, reason, allowed: true, restricted: false, trialDaysRemaining: trial ? Math.ceil((subscription!.trialEnd!.getTime() - now.getTime()) / 864e5) : 0, graceDaysRemaining: reason === "grace" ? Math.ceil((subscription!.gracePeriodEnd!.getTime() - now.getTime()) / 864e5) : 0 } as const;
}
export async function getCompanyEntitlements(companyId: string, now = new Date()) {
  const subscription = await prisma.companySubscription.findUnique({ where: { companyId } });
  const effective = resolveEffectivePlan(subscription, now);
  return { companyId, subscription, ...effective, config: plans[effective.plan] };
}
export async function canAccessFeature(companyId: string, feature: BillingFeature) { const e = await getCompanyEntitlements(companyId); return e.config.features.includes(feature); }
export async function requireSubscriptionAccess(companyId: string) { return getCompanyEntitlements(companyId); }
export async function requireFeature(companyId: string, feature: BillingFeature) { const e = await getCompanyEntitlements(companyId); if (!e.config.features.includes(feature)) throw new BillingAccessError(`Upgrade from ${e.config.name} to use this feature.`, "FEATURE_UNAVAILABLE"); return e; }

export function utcMonthRange(now = new Date()) { return { start: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), end: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)) }; }
export async function getEstimateUsage(companyId: string, now = new Date()) { const e = await getCompanyEntitlements(companyId, now); const { start, end } = utcMonthRange(now); const used = await prisma.estimateUsageEvent.count({ where: { companyId, createdAt: { gte: start, lt: end } } }); return { used, limit: e.config.monthlyEstimateLimit, start, end }; }
export async function canCreateEstimate(companyId: string, now = new Date()) { const e = await getCompanyEntitlements(companyId, now); if (e.config.monthlyEstimateLimit === Number.MAX_SAFE_INTEGER) return true; const usage = await getEstimateUsage(companyId, now); if (usage.used >= usage.limit) throw new BillingAccessError(`The ${e.config.name} plan includes ${usage.limit} estimates per UTC calendar month. Upgrade to create another estimate.`, "PLAN_LIMIT"); return true; }
export async function canInviteUser(companyId: string) { const e = await getCompanyEntitlements(companyId); const count = await prisma.companyMembership.count({ where: { companyId, status: "Active" } }); if (count >= e.config.userLimit) throw new BillingAccessError(`The ${e.config.name} plan allows ${e.config.userLimit} active user${e.config.userLimit === 1 ? "" : "s"}.`, "PLAN_LIMIT"); return true; }
export async function requireCrewCapacity(companyId: string) { const e = await requireFeature(companyId, "operations"); const count = await prisma.crew.count({ where: { companyId, active: true } }); if (count >= e.config.crewLimit) throw new BillingAccessError("Your plan's crew limit has been reached.", "PLAN_LIMIT"); }
export async function requireTruckCapacity(companyId: string) { const e = await requireFeature(companyId, "operations"); const count = await prisma.fleetAsset.count({ where: { companyId, type: "Truck", status: { not: "Retired" } } }); if (count >= e.config.truckLimit) throw new BillingAccessError("Your plan's truck limit has been reached.", "PLAN_LIMIT"); }
