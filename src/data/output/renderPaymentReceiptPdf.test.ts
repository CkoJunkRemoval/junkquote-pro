import { describe, expect, it } from "vitest";
import { renderPaymentReceiptPdf } from "./renderPaymentReceiptPdf";

describe("payment receipt PDF", () => {
  it("renders a downloadable receipt payload", async () => {
    const receipt = await renderPaymentReceiptPdf({ amount: 25, method: "Cash", referenceNumber: null, paymentDate: new Date("2026-07-17"), notes: "", invoice: { invoiceNumber: 4, balanceDue: 75, customer: { firstName: "Jamie", lastName: "Smith" }, company: { name: "JunkQuote Pro" } } } as never);
    expect(receipt.length).toBeGreaterThan(100);
  });
});
