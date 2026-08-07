import { prisma } from "@/lib/prisma";
import { getStripeConnect } from "@/lib/billing/stripe";
import { getOnlinePaymentAvailability } from "./stripeConnect";

const payableStatuses = ["Sent", "Viewed", "Partial", "Overdue"] as const;

export async function getInvoiceOnlinePaymentState(companyId: string, customerId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId, customerId, customer: { companyId } }, select: { id: true, displayNumber: true, status: true, balanceDue: true, company: { select: { currencyCode: true } } } });
  if (!invoice) return { available: false, reason: "NOT_FOUND" } as const;
  if (invoice.status === "Paid" || invoice.balanceDue <= 0) return { available: false, reason: "ALREADY_PAID", invoice } as const;
  if (!(payableStatuses as readonly string[]).includes(invoice.status)) return { available: false, reason: "NOT_PAYABLE", invoice } as const;
  const account = await getOnlinePaymentAvailability(companyId);
  if (!account.available) return { ...account, invoice };
  return { available: true, invoice, accountId: account.accountId } as const;
}

export async function createConnectedInvoiceCheckout(input: { companyId: string; customerId: string; invoiceId: string; origin: string }) {
  const state = await getInvoiceOnlinePaymentState(input.companyId, input.customerId, input.invoiceId);
  if (!state.available) {
    if (state.reason === "ALREADY_PAID") throw new Error("Invoice already paid.");
    throw new Error("Online payment is unavailable for this invoice.");
  }
  const amountCents = Math.round(state.invoice.balanceDue * 100);
  if (amountCents <= 0) throw new Error("Invoice already paid.");
  const currency = state.invoice.company.currencyCode.toLowerCase();
  const stripe = getStripeConnect();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ quantity: 1, price_data: { currency, unit_amount: amountCents, product_data: { name: `Invoice ${state.invoice.displayNumber ?? state.invoice.id}` } } }],
    success_url: `${input.origin}/portal/invoices/${state.invoice.id}?payment=confirming`,
    cancel_url: `${input.origin}/portal/invoices/${state.invoice.id}?payment=cancelled`,
    client_reference_id: state.invoice.id,
    metadata: { invoiceId: state.invoice.id, companyId: input.companyId },
    payment_intent_data: { metadata: { invoiceId: state.invoice.id, companyId: input.companyId } },
  }, { stripeAccount: state.accountId, idempotencyKey: `invoice-checkout-${state.invoice.id}-${amountCents}` });
  if (!session.url) throw new Error("Stripe Checkout did not return a redirect URL.");
  await prisma.payment.upsert({
    where: { stripeCheckoutSessionId: session.id },
    create: { companyId: input.companyId, invoiceId: state.invoice.id, amount: amountCents / 100, method: "CreditCard", paymentDate: new Date(), provider: "Stripe", providerStatus: "Pending", connectedPaymentStatus: "PENDING", stripeCheckoutSessionId: session.id, stripeConnectedAccountId: state.accountId, currency, idempotencyKey: `stripe-checkout:${session.id}`, notes: "Stripe Checkout pending confirmation" },
    update: {},
  });
  return { url: session.url, sessionId: session.id, amountCents, stripeAccount: state.accountId };
}
