import { beforeEach, describe, expect, it, vi } from "vitest";

const { findInvoice, upsertPayment, createCheckout, availability } = vi.hoisted(() => ({ findInvoice: vi.fn(), upsertPayment: vi.fn(), createCheckout: vi.fn(), availability: vi.fn() }));

vi.mock("@/lib/prisma", () => ({ prisma: { invoice: { findFirst: findInvoice }, payment: { upsert: upsertPayment } } }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeConnect: () => ({ checkout: { sessions: { create: createCheckout } } }) }));
vi.mock("./stripeConnect", async importOriginal => ({ ...(await importOriginal<typeof import("./stripeConnect")>()), getOnlinePaymentAvailability: availability }));

import { createConnectedInvoiceCheckout, getInvoiceOnlinePaymentState } from "./connectedCheckout";
import { resolveConnectStatus } from "./stripeConnect";

const openInvoice = { id: "invoice-1", displayNumber: "INV-001", status: "Viewed", balanceDue: 123.45, company: { currencyCode: "USD" } };

describe("Stripe Connect invoice payments", () => {
  beforeEach(() => { vi.clearAllMocks(); findInvoice.mockResolvedValue(openInvoice); availability.mockResolvedValue({ available: true, accountId: "acct_connected" }); createCheckout.mockResolvedValue({ id: "cs_test", url: "https://checkout.stripe.test/session" }); upsertPayment.mockResolvedValue({ id: "payment-1" }); });

  it("requires charges and payouts in addition to submitted details", () => {
    expect(resolveConnectStatus({ details_submitted: true, charges_enabled: false, payouts_enabled: true, requirements: { currently_due: [], past_due: [], disabled_reason: null } } as never)).toBe("ONBOARDING");
    expect(resolveConnectStatus({ details_submitted: true, charges_enabled: true, payouts_enabled: true, requirements: { currently_due: [], past_due: [], disabled_reason: null } } as never)).toBe("CONNECTED");
    expect(resolveConnectStatus({ details_submitted: true, charges_enabled: true, payouts_enabled: true, requirements: { currently_due: ["business_profile.url"], past_due: [], disabled_reason: null } } as never)).toBe("ACTION_REQUIRED");
  });

  it.each([
    ["Paid", 0, "ALREADY_PAID"],
    ["Viewed", 0, "ALREADY_PAID"],
    ["Void", 25, "NOT_PAYABLE"],
    ["Cancelled", 25, "NOT_PAYABLE"],
  ])("rejects %s invoices with balance %s", async (status, balanceDue, reason) => {
    findInvoice.mockResolvedValue({ ...openInvoice, status, balanceDue });
    await expect(getInvoiceOnlinePaymentState("company-1", "customer-1", "invoice-1")).resolves.toMatchObject({ available: false, reason });
  });

  it("uses the server balance and connected account context", async () => {
    const result = await createConnectedInvoiceCheckout({ companyId: "company-1", customerId: "customer-1", invoiceId: "invoice-1", origin: "https://app.example.com" });
    expect(result.amountCents).toBe(12345);
    expect(createCheckout).toHaveBeenCalledWith(expect.objectContaining({ mode: "payment", line_items: [expect.objectContaining({ quantity: 1, price_data: expect.objectContaining({ unit_amount: 12345, currency: "usd" }) })], metadata: { invoiceId: "invoice-1", companyId: "company-1" } }), { stripeAccount: "acct_connected", idempotencyKey: "invoice-checkout-invoice-1-12345" });
  });

  it("fails closed without Connect or plan availability", async () => {
    availability.mockResolvedValue({ available: false, reason: "PLAN_UNAVAILABLE" });
    await expect(createConnectedInvoiceCheckout({ companyId: "company-1", customerId: "customer-1", invoiceId: "invoice-1", origin: "https://app.example.com" })).rejects.toThrow("unavailable");
    expect(createCheckout).not.toHaveBeenCalled();
  });

  it("uses a tenant and customer scoped invoice lookup", async () => {
    await getInvoiceOnlinePaymentState("company-1", "customer-1", "invoice-1");
    expect(findInvoice).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "invoice-1", companyId: "company-1", customerId: "customer-1", customer: { companyId: "company-1" } } }));
  });
});
