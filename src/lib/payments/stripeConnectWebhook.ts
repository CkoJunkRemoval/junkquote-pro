import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { recalculateInvoice } from "./paymentMutations";
import { syncConnectedAccount } from "./stripeConnect";

function id(value: string | { id: string } | null | undefined) { return typeof value === "string" ? value : value?.id ?? null; }

async function mappedCompany(accountId: string | undefined) {
  if (!accountId) throw new Error("Connected event has no account context.");
  const company = await prisma.company.findUnique({ where: { stripeConnectedAccountId: accountId }, select: { id: true } });
  if (!company) throw new Error("Connected Stripe account is not mapped to a company.");
  return company;
}

async function succeed(companyId: string, accountId: string, input: { invoiceId?: string; sessionId?: string; paymentIntentId?: string | null; chargeId?: string | null; amountCents?: number | null; currency?: string | null; paidAt: Date }) {
  if (!input.invoiceId || !input.amountCents || input.amountCents <= 0) throw new Error("Connected payment lacks authoritative invoice or amount data.");
  const amountCents = input.amountCents;
  return prisma.$transaction(async tx => {
    const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true, status: true, balanceDue: true, displayNumber: true } });
    if (!invoice) throw new Error("Connected payment invoice mapping failed.");
    if (["Void", "Cancelled"].includes(invoice.status)) throw new Error("A void or cancelled invoice cannot receive a connected payment.");
    const amount = amountCents / 100;
    let payment = input.sessionId ? await tx.payment.findUnique({ where: { stripeCheckoutSessionId: input.sessionId } }) : null;
    if (!payment && input.paymentIntentId) payment = await tx.payment.findFirst({ where: { companyId, stripeConnectedAccountId: accountId, stripePaymentIntentId: input.paymentIntentId } });
    if (!payment) payment = await tx.payment.findFirst({ where: { companyId, invoiceId: invoice.id, stripeConnectedAccountId: accountId, provider: "Stripe", connectedPaymentStatus: "PENDING", amount } });
    if (payment?.connectedPaymentStatus === "SUCCEEDED") return payment;
    if (amount > invoice.balanceDue + 0.00001) throw new Error("Connected payment exceeds the authoritative invoice balance.");
    payment = payment ? await tx.payment.update({ where: { id: payment.id }, data: { amount, providerStatus: "Captured", connectedPaymentStatus: "SUCCEEDED", paymentDate: input.paidAt, capturedAt: input.paidAt, stripePaymentIntentId: input.paymentIntentId, stripeChargeId: input.chargeId, currency: input.currency?.toLowerCase() ?? payment.currency, failureReason: null, failedAt: null } }) : await tx.payment.create({ data: { companyId, invoiceId: invoice.id, amount, method: "CreditCard", paymentDate: input.paidAt, provider: "Stripe", providerStatus: "Captured", connectedPaymentStatus: "SUCCEEDED", stripeCheckoutSessionId: input.sessionId, stripePaymentIntentId: input.paymentIntentId, stripeChargeId: input.chargeId, stripeConnectedAccountId: accountId, currency: input.currency?.toLowerCase() ?? "usd", capturedAt: input.paidAt, idempotencyKey: input.sessionId ? `stripe-checkout:${input.sessionId}` : `stripe-pi:${input.paymentIntentId}`, notes: "Stripe connected-account payment" } });
    await recalculateInvoice(tx, companyId, invoice.id);
    await tx.auditEvent.create({ data: { companyId, eventType: "payments.stripe_succeeded", entityType: "Payment", entityId: payment.id, metadata: { invoiceId: invoice.id, amount } } });
    return payment;
  });
}

async function refund(companyId: string, accountId: string, charge: Stripe.Charge) {
  const pi = id(charge.payment_intent);
  const payment = await prisma.payment.findFirst({ where: { companyId, stripeConnectedAccountId: accountId, OR: [{ stripeChargeId: charge.id }, ...(pi ? [{ stripePaymentIntentId: pi }] : [])] } });
  if (!payment) throw new Error("Refunded charge has no mapped payment.");
  const total = charge.amount_refunded / 100;
  const delta = total - payment.refundedAmount;
  if (delta <= 0) return payment;
  return prisma.$transaction(async tx => {
    const reference = `stripe-charge-refund:${charge.id}:${charge.amount_refunded}`;
    await tx.refund.upsert({ where: { companyId_externalReference: { companyId, externalReference: reference } }, create: { companyId, paymentId: payment.id, invoiceId: payment.invoiceId, amount: delta, reason: "Stripe refund", externalReference: reference, refundedAt: new Date() }, update: {} });
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { refundedAmount: total, connectedPaymentStatus: total >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED" } });
    await recalculateInvoice(tx, companyId, payment.invoiceId);
    await tx.auditEvent.create({ data: { companyId, eventType: "payments.stripe_refunded", entityType: "Payment", entityId: payment.id, metadata: { invoiceId: payment.invoiceId, refundedAmount: total } } });
    return updated;
  });
}

export async function processStripeConnectEvent(event: Stripe.Event) {
  if (await prisma.stripeWebhookEvent.findUnique({ where: { stripeEventId: event.id } })) return { duplicate: true };
  const accountId = event.account ?? (event.type === "account.updated" ? (event.data.object as Stripe.Account).id : undefined);
  const company = await mappedCompany(accountId);
  if (event.type === "account.updated") await syncConnectedAccount(event.data.object as Stripe.Account);
  else if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status === "paid") await succeed(company.id, accountId!, { invoiceId: session.metadata?.invoiceId, sessionId: session.id, paymentIntentId: id(session.payment_intent), amountCents: session.amount_total, currency: session.currency, paidAt: new Date(event.created * 1000) });
  } else if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await succeed(company.id, accountId!, { invoiceId: intent.metadata.invoiceId, paymentIntentId: intent.id, chargeId: id(intent.latest_charge), amountCents: intent.amount_received, currency: intent.currency, paidAt: new Date(event.created * 1000) });
  } else if (event.type === "payment_intent.payment_failed") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await prisma.payment.updateMany({ where: { companyId: company.id, stripeConnectedAccountId: accountId, connectedPaymentStatus: "PENDING", OR: [{ stripePaymentIntentId: intent.id }, { invoiceId: intent.metadata.invoiceId }] }, data: { providerStatus: "Failed", connectedPaymentStatus: "FAILED", failedAt: new Date(event.created * 1000), failureReason: intent.last_payment_error?.message?.slice(0, 250) ?? "Payment failed" } });
  } else if (event.type === "charge.refunded") await refund(company.id, accountId!, event.data.object as Stripe.Charge);
  else if (event.type === "charge.dispute.created" || event.type === "charge.dispute.closed") {
    const dispute = event.data.object as Stripe.Dispute;
    await prisma.payment.updateMany({ where: { companyId: company.id, stripeConnectedAccountId: accountId, stripeChargeId: id(dispute.charge) }, data: { connectedPaymentStatus: dispute.status === "won" ? "SUCCEEDED" : "DISPUTED" } });
  }
  await prisma.stripeWebhookEvent.create({ data: { stripeEventId: event.id, type: `connect:${event.type}`, companyId: company.id } });
  return { duplicate: false, companyId: company.id };
}
