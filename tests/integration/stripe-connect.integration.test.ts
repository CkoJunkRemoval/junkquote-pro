import { beforeEach, describe, expect, it } from "vitest";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import { processStripeConnectEvent } from "@/lib/payments/stripeConnectWebhook";
import { processStripeEvent } from "@/lib/billing/stripeLifecycle";

function event(id: string, type: string, account: string, object: object) {
  return { id, type, account, created: Math.floor(Date.now() / 1000), data: { object } } as Stripe.Event;
}

async function connectedFixture() {
  const fixtures = await createTenantFixtures();
  await prisma.company.update({ where: { id: fixtures.a.company.id }, data: { stripeConnectedAccountId: "acct_company_a", stripeConnectStatus: "CONNECTED", stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeDetailsSubmitted: true } });
  await prisma.company.update({ where: { id: fixtures.b.company.id }, data: { stripeConnectedAccountId: "acct_company_b", stripeConnectStatus: "CONNECTED", stripeChargesEnabled: true, stripePayoutsEnabled: true, stripeDetailsSubmitted: true } });
  await prisma.companySubscription.create({ data: { companyId: fixtures.a.company.id, plan: "Starter", billingInterval: "Monthly", status: "Active", lastSuccessfulPaymentAt: new Date() } });
  return fixtures;
}

describe("Stripe Connect webhook isolation and reconciliation", () => {
  beforeEach(async () => {
    await resetIntegrationDatabase();
    await prisma.stripeWebhookEvent.deleteMany();
  });

  it("applies a successful connected payment exactly once", async () => {
    const f = await connectedFixture();
    await prisma.payment.create({ data: { companyId: f.a.company.id, invoiceId: f.a.invoice.id, amount: 75, method: "CreditCard", paymentDate: new Date(), provider: "Stripe", providerStatus: "Pending", connectedPaymentStatus: "PENDING", stripeCheckoutSessionId: "cs_a", stripeConnectedAccountId: "acct_company_a" } });
    const stripeEvent = event("evt_success_a", "checkout.session.completed", "acct_company_a", { id: "cs_a", payment_status: "paid", amount_total: 7500, currency: "usd", payment_intent: "pi_a", metadata: { invoiceId: f.a.invoice.id, companyId: f.a.company.id } });
    await processStripeConnectEvent(stripeEvent);
    await expect(processStripeConnectEvent(stripeEvent)).resolves.toEqual({ duplicate: true });
    const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: f.a.invoice.id } });
    expect(invoice).toMatchObject({ status: "Paid", balanceDue: 0 });
    expect(await prisma.payment.count({ where: { companyId: f.a.company.id, provider: "Stripe", connectedPaymentStatus: "SUCCEEDED" } })).toBe(1);
  });

  it("fails closed on cross-tenant invoice metadata", async () => {
    const f = await connectedFixture();
    await expect(processStripeConnectEvent(event("evt_cross", "payment_intent.succeeded", "acct_company_a", { id: "pi_cross", amount_received: 7500, currency: "usd", latest_charge: "ch_cross", metadata: { invoiceId: f.b.invoice.id, companyId: f.b.company.id } }))).rejects.toThrow("mapping failed");
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: f.b.invoice.id } })).balanceDue).toBe(75);
  });

  it("does not apply failed payments and restores balance after refunds", async () => {
    const f = await connectedFixture();
    const pending = await prisma.payment.create({ data: { companyId: f.a.company.id, invoiceId: f.a.invoice.id, amount: 75, method: "CreditCard", paymentDate: new Date(), provider: "Stripe", providerStatus: "Pending", connectedPaymentStatus: "PENDING", stripeCheckoutSessionId: "cs_failed", stripeConnectedAccountId: "acct_company_a" } });
    await processStripeConnectEvent(event("evt_failed", "payment_intent.payment_failed", "acct_company_a", { id: "pi_failed", metadata: { invoiceId: f.a.invoice.id }, last_payment_error: { message: "declined" } }));
    expect(await prisma.payment.findUnique({ where: { id: pending.id } })).toMatchObject({ connectedPaymentStatus: "FAILED", providerStatus: "Failed" });
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: f.a.invoice.id } })).balanceDue).toBe(75);

    const paid = await prisma.payment.create({ data: { companyId: f.a.company.id, invoiceId: f.a.invoice.id, amount: 75, method: "CreditCard", paymentDate: new Date(), provider: "Stripe", connectedPaymentStatus: "SUCCEEDED", stripePaymentIntentId: "pi_refund", stripeChargeId: "ch_refund", stripeConnectedAccountId: "acct_company_a" } });
    await prisma.invoice.update({ where: { id: f.a.invoice.id }, data: { status: "Paid", balanceDue: 0 } });
    await processStripeConnectEvent(event("evt_refund", "charge.refunded", "acct_company_a", { id: "ch_refund", payment_intent: "pi_refund", amount_refunded: 2500 }));
    expect(await prisma.payment.findUnique({ where: { id: paid.id } })).toMatchObject({ refundedAmount: 25, connectedPaymentStatus: "PARTIALLY_REFUNDED" });
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: f.a.invoice.id } })).balanceDue).toBe(25);
  });

  it("keeps Connect and SaaS subscription events separated", async () => {
    const f = await connectedFixture();
    const before = await prisma.companySubscription.findUniqueOrThrow({ where: { companyId: f.a.company.id } });
    await processStripeConnectEvent(event("evt_connect_subscription", "customer.subscription.updated", "acct_company_a", { id: "sub_untrusted" }));
    expect(await prisma.companySubscription.findUniqueOrThrow({ where: { companyId: f.a.company.id } })).toMatchObject({ id: before.id, plan: before.plan, status: before.status });
    await processStripeEvent(event("evt_platform_payment", "payment_intent.succeeded", "acct_company_a", { id: "pi_platform", metadata: { invoiceId: f.a.invoice.id } }));
    expect((await prisma.invoice.findUniqueOrThrow({ where: { id: f.a.invoice.id } })).balanceDue).toBe(75);
  });
});
