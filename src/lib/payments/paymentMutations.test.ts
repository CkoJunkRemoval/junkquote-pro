import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findInvoice: vi.fn(), aggregate: vi.fn(), create: vi.fn(), updateInvoice: vi.fn(), transition: vi.fn(), event: vi.fn(), sync: vi.fn(), emit: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/estimates/estimateLifecycle", () => ({ transitionEstimateInTransaction: mocks.transition }));
vi.mock("@/lib/estimates/estimateEvents", () => ({ recordEstimateEventInTransaction: mocks.event }));
vi.mock("@/lib/smartPricing/outcomes", () => ({ syncPricingOutcomeForInvoice: mocks.sync }));
vi.mock("@/lib/communications/engine", () => ({ emitCommunicationEventForSource: mocks.emit }));
import { recordPayment } from "./paymentMutations";

describe("addPayment validation", () => {
  beforeEach(() => vi.clearAllMocks());
  function transaction() { mocks.transaction.mockImplementation(async (callback) => callback({ invoice: { findFirst: mocks.findInvoice, update: mocks.updateInvoice }, payment: { aggregate: mocks.aggregate, create: mocks.create }, refund: { aggregate: mocks.aggregate } })); }
  it("rejects overpayments", async () => { transaction(); mocks.findInvoice.mockResolvedValue({ id: "invoice-1", companyId: "tenant-a", total: 100, status: "Sent" }); mocks.aggregate.mockResolvedValue({ _sum: { amount: 90 } }); await expect(recordPayment("tenant-a", "invoice-1", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("cannot exceed"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("rejects payments for cancelled invoices", async () => { transaction(); mocks.findInvoice.mockResolvedValue({ id: "invoice-1", companyId: "tenant-a", total: 100, status: "Cancelled" }); await expect(recordPayment("tenant-a", "invoice-1", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("Cancelled invoices"); });
  it("rejects another tenant's invoice without creating a payment", async () => { transaction(); mocks.findInvoice.mockResolvedValue(null); await expect(recordPayment("tenant-a", "invoice-b", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("Invoice not found"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("advances an invoiced estimate when the payment fully reconciles the invoice", async () => {
    transaction();
    mocks.findInvoice
      .mockResolvedValueOnce({ id: "invoice-1", companyId: "tenant-a", total: 100, status: "Sent", estimateId: "estimate-1", displayNumber: "INV-1" })
      .mockResolvedValueOnce({ id: "invoice-1", total: 100, dueDate: null, estimateId: "estimate-1", estimate: { status: "Invoiced" } });
    mocks.aggregate
      .mockResolvedValueOnce({ _sum: { amount: 0 } })
      .mockResolvedValueOnce({ _sum: { amount: 100 } })
      .mockResolvedValueOnce({ _sum: { amount: 0 } });
    mocks.create.mockResolvedValue({ id: "payment-1" });

    await recordPayment("tenant-a", "invoice-1", { amount: 100, method: "Cash", paymentDate: new Date() });

    expect(mocks.updateInvoice).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "Paid", balanceDue: 0 }) }));
    expect(mocks.transition).toHaveBeenCalledWith(expect.any(Object), "tenant-a", "estimate-1", "Paid", expect.objectContaining({ metadata: expect.objectContaining({ paymentId: "payment-1" }) }));
    expect(mocks.event).not.toHaveBeenCalled();
  });
});
