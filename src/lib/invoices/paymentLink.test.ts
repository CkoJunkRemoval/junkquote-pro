import { describe, expect, it } from "vitest";
import { customerInvoicePaymentUrl } from "./paymentLink";

describe("customer invoice payment links", () => {
  it("builds only the secure customer-facing invoice URL", () => {
    expect(customerInvoicePaymentUrl("https://app.example.com/admin", { id: "inv 1", balanceDue: 125, status: "Sent" }))
      .toBe("https://app.example.com/portal/invoices/inv%201");
  });
  it.each(["Paid", "Void", "Cancelled"])("does not expose a link for %s invoices", status => {
    expect(customerInvoicePaymentUrl("https://app.example.com", { id: "inv-1", balanceDue: 125, status })).toBeNull();
  });
  it("does not expose a link without a balance", () => {
    expect(customerInvoicePaymentUrl("https://app.example.com", { id: "inv-1", balanceDue: 0, status: "Sent" })).toBeNull();
  });
});
