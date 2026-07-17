import { describe, expect, it } from "vitest";
import { deriveInvoicePaymentState } from "./paymentRecalculation";

describe("payment invoice recalculation", () => {
  const now = new Date("2026-07-17T12:00:00.000Z");
  it("marks a partial payment and retains balance", () => expect(deriveInvoicePaymentState(100, 25, null, now)).toMatchObject({ balanceDue: 75, status: "Partial", paidDate: null }));
  it("marks a full payment paid and sets paid date", () => expect(deriveInvoicePaymentState(100, 100, null, now)).toMatchObject({ balanceDue: 0, status: "Paid", paidDate: now }));
  it("handles multiple payments through their summed amount", () => expect(deriveInvoicePaymentState(100, 40 + 35, null, now)).toMatchObject({ balanceDue: 25, status: "Partial" }));
  it("clears paid date when a deleted payment leaves a balance", () => expect(deriveInvoicePaymentState(100, 60, null, now)).toMatchObject({ paidDate: null, status: "Partial" }));
  it("returns sent or overdue when no payments remain", () => {
    expect(deriveInvoicePaymentState(100, 0, new Date("2026-07-20T00:00:00.000Z"), now).status).toBe("Sent");
    expect(deriveInvoicePaymentState(100, 0, new Date("2026-07-01T00:00:00.000Z"), now).status).toBe("Overdue");
  });
});
