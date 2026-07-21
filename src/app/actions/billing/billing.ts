"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { requireTenantContext } from "@/lib/auth/tenant";
import { getStripe } from "@/lib/billing/stripe";
import { plans } from "@/lib/billing/config";
import { prisma } from "@/lib/prisma";
import type { SubscriptionPlan } from "@/generated/prisma/client";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { withDistributedLock } from "@/lib/distributed/locks";

async function billingContext() { const context = await requireTenantContext(); if (context.role !== "Owner" && !context.membership.billingAdmin) throw new Error("Only company owners or billing administrators can manage billing."); return context; }
async function origin() { const requestHeaders = await headers(); return process.env.NEXT_PUBLIC_APP_URL ?? requestHeaders.get("origin") ?? `${requestHeaders.get("x-forwarded-proto") ?? "https"}://${requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host")}`; }
async function enforceBillingLimit(companyId: string, userId: string) { if (!(await checkRateLimit(`billing:${companyId}:${userId}`, ratePolicies.billing)).allowed) throw new Error("Too many billing requests. Try again later."); }

export async function startCheckoutAction(plan: SubscriptionPlan) {
  const context = await billingContext(); await enforceBillingLimit(context.companyId, context.user.id);
  return withDistributedLock("billing-checkout", context.companyId, 60_000, async () => {
    const config = plans[plan]; if (!config.priceId) throw new Error(`Stripe price ID for ${plan} is not configured.`);
    let subscription = await prisma.companySubscription.findUnique({ where: { companyId: context.companyId } });
    if (subscription?.stripeSubscriptionId && ["Active", "Trialing", "PastDue"].includes(subscription.status)) throw new Error("This company already has a subscription. Use Manage Billing to change plans.");
    const stripe = getStripe(); let customerId = subscription?.stripeCustomerId;
    if (!customerId) { const customer = await stripe.customers.create({ email: context.user.email, name: context.company.name, metadata: { companyId: context.companyId } }); customerId = customer.id; subscription = await prisma.companySubscription.upsert({ where: { companyId: context.companyId }, create: { companyId: context.companyId, stripeCustomerId: customerId, plan, status: "Incomplete" }, update: { stripeCustomerId: customerId } }); }
    const base = await origin(); const session = await stripe.checkout.sessions.create({ mode: "subscription", customer: customerId, line_items: [{ price: config.priceId, quantity: 1 }], success_url: `${base}/billing/success?session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${base}/billing/cancel`, client_reference_id: context.companyId, metadata: { companyId: context.companyId, plan }, subscription_data: { metadata: { companyId: context.companyId, plan } } });
    if (!session.url) throw new Error("Stripe Checkout did not return a URL."); redirect(session.url);
  });
}
export async function openBillingPortalAction() {
  const context = await billingContext(); await enforceBillingLimit(context.companyId, context.user.id);
  const subscription = await prisma.companySubscription.findUnique({ where: { companyId: context.companyId } }); if (!subscription?.stripeCustomerId) throw new Error("No Stripe billing account exists yet.");
  const session = await getStripe().billingPortal.sessions.create({ customer: subscription.stripeCustomerId, return_url: `${await origin()}/settings/billing` }); redirect(session.url);
}
