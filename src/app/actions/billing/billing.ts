"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthorizationError, requireTenantContext } from "@/lib/auth/tenant";
import { canManageBilling } from "@/lib/billing/permissions";
import { getStripe, validateCheckoutSelection } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { withDistributedLock } from "@/lib/distributed/locks";
import { billingCheckoutFailure } from "@/lib/billing/checkoutErrors";

export type BillingCheckoutActionState = { error: string | null };

async function billingContext() { const context = await requireTenantContext(); if (!canManageBilling(context.role, context.membership.billingAdmin)) throw new AuthorizationError("FORBIDDEN", "Only company Owners and Admins can manage billing."); return context; }
async function appOrigin() { const configured = process.env.NEXT_PUBLIC_APP_URL?.trim(); if (configured) return new URL(configured).origin; const h = await headers(); const host = h.get("x-forwarded-host") ?? h.get("host"); if (!host) throw new Error("The application URL is not configured."); return new URL(`${h.get("x-forwarded-proto") === "http" ? "http" : "https"}://${host}`).origin; }
async function enforceBillingLimit(companyId: string, userId: string) { if (!(await checkRateLimit(`billing:${companyId}:${userId}`, ratePolicies.billing)).allowed) throw new Error("Too many billing requests. Try again later."); }

export async function startCheckoutAction(plan: string, interval: string, _previousState?: BillingCheckoutActionState): Promise<BillingCheckoutActionState> {
  void _previousState;
  const context = await billingContext();
  let checkoutUrl: string;
  try {
    await enforceBillingLimit(context.companyId, context.user.id);
    const selection = validateCheckoutSelection(plan, interval);
    checkoutUrl = await withDistributedLock("billing-checkout", context.companyId, 60_000, async () => {
    let subscription = await prisma.companySubscription.findUnique({ where: { companyId: context.companyId } });
    if (subscription?.stripeSubscriptionId && ["Active", "PastDue", "Paused"].includes(subscription.status)) throw new Error("This company already has a paid subscription. Use Manage Billing to change it.");
    const stripe = getStripe(); let customerId = subscription?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: context.user.email, name: context.company.name, metadata: { companyId: context.companyId } }, { idempotencyKey: `company-customer-${context.companyId}` });
      customerId = customer.id;
      subscription = await prisma.companySubscription.upsert({ where: { companyId: context.companyId }, create: { companyId: context.companyId, stripeCustomerId: customerId, plan: "Free", status: "Incomplete", trialStatus: "Ineligible" }, update: { stripeCustomerId: customerId } });
    }
    const base = await appOrigin();
    const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, line_items: [{ price: selection.priceId, quantity: 1 }], success_url: `${base}/billing/success`, cancel_url: `${base}/billing/cancel`, client_reference_id: context.companyId, metadata: { companyId: context.companyId, plan: selection.plan, interval: selection.interval }, subscription_data: { metadata: { companyId: context.companyId } } }, { idempotencyKey: `checkout-${context.companyId}-${selection.plan}-${selection.interval}-${Math.floor(Date.now() / 60000)}` });
    if (!session.url) throw new Error("Stripe Checkout did not return a URL.");
    await prisma.auditEvent.create({ data: { companyId: context.companyId, actingUserId: context.user.id, eventType: "billing.checkout_initiated", entityType: "Subscription", entityId: subscription!.id, metadata: { plan: selection.plan, interval: selection.interval } } });
      return session.url;
    });
  } catch (error) {
    const failure = billingCheckoutFailure(error);
    const metadata = { plan, interval, category: failure.category, statusCode: failure.statusCode, stripeType: failure.stripeType, stripeCode: failure.stripeCode };
    console.error("[billing] checkout failed", { companyId: context.companyId, userId: context.user.id, ...metadata });
    try {
      await prisma.auditEvent.create({ data: { companyId: context.companyId, actingUserId: context.user.id, eventType: "billing.checkout_failed", entityType: "Subscription", entityId: context.companyId, metadata } });
    } catch {
      console.error("[billing] checkout failure audit could not be persisted", { companyId: context.companyId, category: failure.category });
    }
    return { error: failure.message };
  }
  redirect(checkoutUrl);
}

export async function openBillingPortalAction() {
  const context = await billingContext(); await enforceBillingLimit(context.companyId, context.user.id);
  const subscription = await prisma.companySubscription.findUnique({ where: { companyId: context.companyId } });
  if (!subscription?.stripeCustomerId) redirect("/pricing");
  const session = await getStripe().billingPortal.sessions.create({ customer: subscription.stripeCustomerId, return_url: `${await appOrigin()}/settings/billing` });
  await prisma.auditEvent.create({ data: { companyId: context.companyId, actingUserId: context.user.id, eventType: "billing.portal_opened", entityType: "Subscription", entityId: subscription.id } });
  redirect(session.url);
}
