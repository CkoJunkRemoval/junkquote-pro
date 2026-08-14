import "server-only";
import type { CompanyClassification, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveEffectivePlan } from "@/lib/billing/entitlements";

const paidStatuses = ["Active", "PastDue", "Paused"] as const;
export const requiredReason = (value: unknown) => {
  const reason = String(value ?? "").trim();
  if (reason.length < 3) throw new Error("A reason is required.");
  return reason.slice(0, 500);
};
export const hasQualifyingPaidSubscription = (subscription: { stripeSubscriptionId: string | null; status: string; lastSuccessfulPaymentAt: Date | null } | null) =>
  Boolean(subscription?.stripeSubscriptionId && subscription.lastSuccessfulPaymentAt && paidStatuses.includes(subscription.status as never));

const audit = (actorId: string, companyId: string, eventType: string, before: unknown, after: unknown, reason: string) => ({
  companyId, actingUserId: actorId, eventType, entityType: "Company", entityId: companyId,
  metadata: { before, after, reason } as Prisma.InputJsonValue,
});

export async function changeCompanyClassification(actorId: string, companyId: string, classification: CompanyClassification, reason: string) {
  reason = requiredReason(reason);
  return prisma.$transaction(async tx => {
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { classification: true } });
    if (!company) throw new Error("Company not found.");
    const updated = await tx.company.update({ where: { id: companyId }, data: { classification } });
    await tx.auditEvent.create({ data: audit(actorId, companyId, "platform_admin.company_classification_changed", { classification: company.classification }, { classification }, reason) });
    return updated;
  });
}

export async function mutateManualTrial(actorId: string, companyId: string, operation: "grant" | "extend" | "end", expiration: Date | null, reason: string, now = new Date()) {
  reason = requiredReason(reason);
  return prisma.$transaction(async tx => {
    const existing = await tx.companySubscription.findUnique({ where: { companyId } });
    if (hasQualifyingPaidSubscription(existing)) throw new Error("Trial controls are disabled while a qualifying paid Stripe subscription exists.");
    let trialEnd: Date | null = null;
    if (operation !== "end") {
      if (!expiration || Number.isNaN(expiration.getTime()) || expiration <= now) throw new Error("Trial expiration must be in the future.");
      trialEnd = operation === "extend" && existing?.trialEnd && existing.trialEnd > now
        ? new Date(existing.trialEnd.getTime() + (expiration.getTime() - now.getTime())) : expiration;
    }
    const before = existing ? { trialStatus: existing.trialStatus, trialEnd: existing.trialEnd?.toISOString() ?? null } : { trialStatus: null, trialEnd: null };
    const subscription = await tx.companySubscription.upsert({ where: { companyId }, create: { companyId, plan: "Free", status: "Incomplete", trialPlan: "Professional", trialStatus: operation === "end" ? "Expired" : "Active", trialEnd, trialStart: operation === "end" ? null : now, trialExpiredAt: operation === "end" ? now : null }, update: { trialPlan: "Professional", trialStatus: operation === "end" ? "Expired" : "Active", trialEnd, trialExpiredAt: operation === "end" ? now : null, ...(operation === "grant" ? { trialStart: now } : {}) } });
    const after = { trialStatus: subscription.trialStatus, trialEnd: subscription.trialEnd?.toISOString() ?? null };
    await tx.auditEvent.create({ data: audit(actorId, companyId, `platform_admin.trial_${operation === "extend" ? "extended" : operation === "end" ? "ended" : "granted"}`, before, after, reason) });
    return subscription;
  });
}

export async function setCompanySuspension(actorId: string, companyId: string, suspended: boolean, reason: string) {
  reason = requiredReason(reason);
  return prisma.$transaction(async tx => {
    const company = await tx.company.findUnique({ where: { id: companyId }, select: { active: true, stripeConnectStatus: true, subscription: { select: { status: true } } } });
    if (!company) throw new Error("Company not found.");
    const now = new Date();
    await tx.company.update({ where: { id: companyId }, data: { active: !suspended, suspendedAt: suspended ? now : null, suspendedReason: suspended ? reason : null } });
    if (suspended) {
      await tx.user.updateMany({ where: { id: { not: actorId }, memberships: { some: { companyId } } }, data: { sessionVersion: { increment: 1 } } });
      await tx.customerPortalSession.updateMany({ where: { portalAccess: { companyId }, revokedAt: null }, data: { revokedAt: now } });
    }
    await tx.auditEvent.create({ data: audit(actorId, companyId, suspended ? "platform_admin.company_suspended" : "platform_admin.company_reactivated", { active: company.active, subscriptionStatus: company.subscription?.status, connectStatus: company.stripeConnectStatus }, { active: !suspended, subscriptionStatus: company.subscription?.status, connectStatus: company.stripeConnectStatus }, reason) });
  });
}

export async function getDeletionPreview(companyId: string) {
  const company = await prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true, createdAt: true, classification: true, stripeConnectStatus: true, subscription: { select: { status: true, stripeSubscriptionId: true, lastSuccessfulPaymentAt: true } }, _count: { select: { memberships: true, customers: true, estimates: true, invoices: true, payments: true } } } });
  if (!company) return null;
  const livePayments = await prisma.payment.count({ where: { companyId, OR: [{ connectedPaymentStatus: { in: ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED", "DISPUTED"] } }, { provider: "Stripe", providerStatus: "Captured" }] } });
  return { ...company, livePayments, safeToDelete: company.classification === "TEST" && !company.subscription?.lastSuccessfulPaymentAt && livePayments === 0 };
}

export async function deleteTestCompany(actorId: string, companyId: string, confirmation: string, reason: string) {
  reason = requiredReason(reason);
  const preview = await getDeletionPreview(companyId);
  if (!preview) throw new Error("Company not found.");
  if (preview.classification !== "TEST") throw new Error("Only TEST companies can be deleted.");
  if (confirmation.trim() !== preview.name) throw new Error("Type the exact company name to confirm deletion.");
  if (!preview.safeToDelete) throw new Error("Deletion is blocked because this company has financial activity requiring retention. Suspend it instead.");
  await prisma.$transaction(async tx => {
    // These fleet/finance document trees intentionally use restrictive foreign keys;
    // remove only the target tenant's fixture-owned leaves before the company cascade.
    await tx.taxChecklistItem.deleteMany({ where: { companyId } });
    await tx.taxDocument.deleteMany({ where: { companyId } });
    await tx.financeDocument.deleteMany({ where: { companyId } });
    await tx.expenseAllocation.deleteMany({ where: { expense: { companyId } } });
    await tx.expenseRevision.deleteMany({ where: { expense: { companyId } } });
    await tx.assetTimelineEvent.deleteMany({ where: { companyId } });
    await tx.assetDocument.deleteMany({ where: { companyId } });
    await tx.inspectionDefect.deleteMany({ where: { companyId } });
    await tx.inspectionRecord.deleteMany({ where: { companyId } });
    await tx.inspectionTemplate.deleteMany({ where: { companyId } });
    await tx.assetMaintenanceRecord.deleteMany({ where: { companyId } });
    await tx.maintenanceSchedule.deleteMany({ where: { companyId } });
    await tx.assetAssignment.deleteMany({ where: { companyId } });
    await tx.assetMileageEntry.deleteMany({ where: { companyId } });
    await tx.fuelEntry.deleteMany({ where: { companyId } });
    await tx.company.delete({ where: { id: companyId } });
    await tx.platformCompanyDeletionTombstone.create({ data: { deletedCompanyId: companyId, companyName: preview.name, classification: preview.classification, deletedByUserId: actorId, reason, safeCounts: preview._count } });
  });
}

export function effectivePlan(subscription: Parameters<typeof resolveEffectivePlan>[0], now = new Date()) { return resolveEffectivePlan(subscription, now).plan; }
