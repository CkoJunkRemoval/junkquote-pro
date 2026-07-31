import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { billingConfig, catalogEntryForPriceId } from "./config";
import type { SubscriptionStatus } from "@/generated/prisma/client";

const date = (seconds: number | null | undefined) => seconds ? new Date(seconds * 1000) : null;
export function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus { return ({ trialing: "Trialing", active: "Active", past_due: "PastDue", unpaid: "Unpaid", canceled: "Canceled", incomplete: "Incomplete", incomplete_expired: "Incomplete", paused: "Paused" } as const)[status] ?? "Incomplete"; }
export function grantsPaidAccess(status: SubscriptionStatus, paidAt: Date | null, graceEnd: Date | null, now = new Date()) { return Boolean(paidAt && (status === "Active" || (status === "PastDue" && graceEnd && graceEnd > now))); }

async function notifyBillingAdmins(companyId: string, eventId: string, title: string, body: string) {
  const users = await prisma.companyMembership.findMany({ where: { companyId, status: "Active", role: { in: ["Owner", "Admin"] } }, select: { userId: true } });
  for (const user of users) await prisma.systemNotification.upsert({ where: { companyId_userId_channel_sourceId: { companyId, userId: user.userId, channel: "in-app", sourceId: `stripe:${eventId}` } }, create: { companyId, userId: user.userId, channel: "in-app", sourceType: "StripeBilling", sourceId: `stripe:${eventId}`, title, body, link: "/settings/billing" }, update: {} });
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, source: string, eventCreated?: number) {
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const existing = await prisma.companySubscription.findFirst({ where: { OR: [{ stripeCustomerId: customerId }, { stripeSubscriptionId: subscription.id }] } });
  const companyId = existing?.companyId ?? subscription.metadata.companyId;
  if (!companyId) throw new Error("Stripe subscription has no authoritative company mapping.");
  const eventAt = eventCreated ? date(eventCreated) : new Date();
  if (existing?.lastStripeEventCreatedAt && eventAt && existing.lastStripeEventCreatedAt > eventAt) return existing;
  const raw = subscription as unknown as Record<string, unknown>;
  const itemRaw = subscription.items.data[0] as unknown as Record<string, unknown> | undefined;
  const priceId = subscription.items.data[0]?.price.id;
  const catalog = priceId ? catalogEntryForPriceId(priceId) : null;
  if (!catalog) throw new Error("Stripe subscription uses an unknown price; paid access was not granted.");
  const status = mapStripeStatus(subscription.status);
  const gracePeriodEnd = status === "PastDue" ? existing?.gracePeriodEnd ?? new Date(Date.now() + billingConfig.pastDueGraceDays * 864e5) : null;
  const converted = Boolean(existing?.trialStatus === "Active" && ["Active", "PastDue"].includes(status));
  return prisma.$transaction(async (tx) => {
    const record = await tx.companySubscription.upsert({ where: { companyId }, create: { companyId, stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, stripePriceId: priceId, plan: catalog.plan, billingInterval: catalog.interval, status, currentPeriodStart: date((raw.current_period_start ?? itemRaw?.current_period_start) as number), currentPeriodEnd: date((raw.current_period_end ?? itemRaw?.current_period_end) as number), cancelAtPeriodEnd: subscription.cancel_at_period_end, canceledAt: date(subscription.canceled_at), gracePeriodEnd, lastStripeEventCreatedAt: eventAt, trialStatus: "Ineligible" }, update: { stripeCustomerId: customerId, stripeSubscriptionId: subscription.id, stripePriceId: priceId, plan: catalog.plan, billingInterval: catalog.interval, status, currentPeriodStart: date((raw.current_period_start ?? itemRaw?.current_period_start) as number), currentPeriodEnd: date((raw.current_period_end ?? itemRaw?.current_period_end) as number), cancelAtPeriodEnd: subscription.cancel_at_period_end, canceledAt: date(subscription.canceled_at), gracePeriodEnd, lastStripeEventCreatedAt: eventAt, ...(converted ? { trialStatus: "Converted", paidSubscriptionStartedAt: existing?.paidSubscriptionStartedAt ?? new Date() } : {}) } });
    await tx.subscriptionHistory.create({ data: { companyId, plan: catalog.plan, status, stripeSubscriptionId: subscription.id, source, metadata: { priceId, interval: catalog.interval } } });
    const eventType = !existing || (existing.status !== "Active" && status === "Active") ? "billing.subscription_activated" : existing.plan !== catalog.plan ? "billing.plan_changed" : subscription.cancel_at_period_end && !existing.cancelAtPeriodEnd ? "billing.cancellation_scheduled" : !subscription.cancel_at_period_end && existing.cancelAtPeriodEnd ? "billing.cancellation_reversed" : status === "Canceled" ? "billing.subscription_ended" : "billing.subscription_synchronized";
    await tx.auditEvent.create({ data: { companyId, eventType, entityType: "Subscription", entityId: record.id, metadata: { plan: catalog.plan, interval: catalog.interval, status, source } } });
    if (converted) await tx.auditEvent.create({ data: { companyId, eventType: "billing.trial_converted", entityType: "Subscription", entityId: record.id } });
    return record;
  });
}

export async function processStripeEvent(event: Stripe.Event) {
  if (await prisma.stripeWebhookEvent.findUnique({ where: { stripeEventId: event.id } })) return { duplicate: true };
  let companyId: string | undefined;
  if (event.type === "checkout.session.completed") {
    const session = event.data.object; companyId = session.metadata?.companyId;
    if (session.subscription) { const { getStripe } = await import("./stripe"); const sub = await getStripe().subscriptions.retrieve(typeof session.subscription === "string" ? session.subscription : session.subscription.id); companyId = (await syncStripeSubscription(sub, event.type, event.created)).companyId; }
  } else if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    companyId = (await syncStripeSubscription(event.data.object as Stripe.Subscription, event.type, event.created)).companyId;
  } else if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
    const invoice = event.data.object; const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
    const existing = customerId ? await prisma.companySubscription.findFirst({ where: { stripeCustomerId: customerId } }) : null; companyId = existing?.companyId;
    if (existing) {
      const paid = event.type === "invoice.paid";
      await prisma.companySubscription.update({ where: { companyId: existing.companyId }, data: paid ? { lastSuccessfulPaymentAt: new Date(event.created * 1000), paidSubscriptionStartedAt: existing.paidSubscriptionStartedAt ?? new Date(event.created * 1000) } : { status: "PastDue", gracePeriodEnd: new Date(Date.now() + billingConfig.pastDueGraceDays * 864e5) } });
      await prisma.auditEvent.create({ data: { companyId: existing.companyId, eventType: paid ? "billing.payment_succeeded" : "billing.payment_failed", entityType: "Subscription", entityId: existing.id } });
      const invoiceRaw = invoice as unknown as { parent?: { subscription_details?: { subscription?: string | { id: string } } } };
      const invoiceSubscription = invoiceRaw.parent?.subscription_details?.subscription;
      if (paid && invoiceSubscription) { const { getStripe } = await import("./stripe"); const sub = await getStripe().subscriptions.retrieve(typeof invoiceSubscription === "string" ? invoiceSubscription : invoiceSubscription.id); await syncStripeSubscription(sub, event.type, event.created); }
    }
  } else if (event.type === "customer.updated") {
    const customer = event.data.object; companyId = (await prisma.companySubscription.findFirst({ where: { stripeCustomerId: customer.id }, select: { companyId: true } }))?.companyId;
  }
  await prisma.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: event.type, companyId } });
  if (companyId) {
    if (event.type === "invoice.paid") await notifyBillingAdmins(companyId, event.id, "Subscription payment received", "Your paid plan has been synchronized.");
    else if (event.type === "invoice.payment_failed") await notifyBillingAdmins(companyId, event.id, "Subscription payment failed", "Update your payment method in Billing to avoid losing paid access after the grace period.");
    else if (event.type === "customer.subscription.deleted") await notifyBillingAdmins(companyId, event.id, "Subscription ended", "Your company has moved to its remaining eligible access or the Free plan; records are preserved.");
    else if (event.type === "customer.subscription.updated" && (event.data.object as Stripe.Subscription).cancel_at_period_end) await notifyBillingAdmins(companyId, event.id, "Subscription cancellation scheduled", "Paid access continues through the current period shown in Billing.");
  }
  return { duplicate: false, companyId };
}
