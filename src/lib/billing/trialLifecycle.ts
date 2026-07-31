import { prisma } from "@/lib/prisma";

const milestones = [1, 3, 7, 14, 30] as const;
export async function catchUpTrialLifecycle(companyId: string, now = new Date()) {
  const subscription = await prisma.companySubscription.findUnique({ where: { companyId } });
  if (!subscription || subscription.trialStatus !== "Active" || !subscription.trialEnd) return { processed: false };
  if (subscription.trialEnd <= now) {
    await prisma.$transaction(async tx => {
      const changed = await tx.companySubscription.updateMany({ where: { companyId, trialStatus: "Active", trialEnd: { lte: now } }, data: { trialStatus: "Expired", trialExpiredAt: subscription.trialEnd } });
      if (changed.count) await tx.auditEvent.create({ data: { companyId, eventType: "billing.trial_expired", entityType: "Subscription", entityId: subscription.id, metadata: { effectivePlan: "Free" } } });
    });
  }
  const remaining = Math.max(0, Math.ceil((subscription.trialEnd.getTime() - now.getTime()) / 864e5));
  const milestone = milestones.find(days => remaining <= days);
  const users = await prisma.companyMembership.findMany({ where: { companyId, status: "Active", role: { in: ["Owner", "Admin"] } }, select: { userId: true } });
  const key = remaining === 0 ? "expired" : milestone ? `${milestone}-days` : null;
  if (key) for (const user of users) await prisma.systemNotification.upsert({ where: { companyId_userId_channel_sourceId: { companyId, userId: user.userId, channel: "in-app", sourceId: `billing-trial:${key}` } }, create: { companyId, userId: user.userId, channel: "in-app", sourceType: "BillingTrial", sourceId: `billing-trial:${key}`, title: remaining === 0 ? "Professional trial ended" : `${milestone} days remain in your Professional trial`, body: remaining === 0 ? "Your company is now on Free. Existing records are preserved and six estimates are included each month." : "Subscribe from Billing to keep paid features after the trial.", link: "/settings/billing" }, update: {} });
  return { processed: true, remaining, milestone: key };
}

export async function processDueTrialLifecycle(now = new Date()) {
  const rows = await prisma.companySubscription.findMany({ where: { trialStatus: "Active", trialEnd: { lte: new Date(now.getTime() + 30 * 864e5) } }, select: { companyId: true } });
  return Promise.all(rows.map(row => catchUpTrialLifecycle(row.companyId, now)));
}
