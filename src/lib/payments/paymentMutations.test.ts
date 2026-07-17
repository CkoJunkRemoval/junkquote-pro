import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findInvoice: vi.fn(), aggregate: vi.fn(), create: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { recordPayment } from "./paymentMutations";

describe("addPayment validation", () => {
  beforeEach(() => vi.clearAllMocks());
  function transaction() { mocks.transaction.mockImplementation(async (callback) => callback({ invoice: { findFirst: mocks.findInvoice }, payment: { aggregate: mocks.aggregate, create: mocks.create } })); }
  it("rejects overpayments", async () => { transaction(); mocks.findInvoice.mockResolvedValue({ id: "invoice-1", companyId: "tenant-a", total: 100, status: "Sent" }); mocks.aggregate.mockResolvedValue({ _sum: { amount: 90 } }); await expect(recordPayment("tenant-a", "invoice-1", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("cannot exceed"); expect(mocks.create).not.toHaveBeenCalled(); });
  it("rejects payments for cancelled invoices", async () => { transaction(); mocks.findInvoice.mockResolvedValue({ id: "invoice-1", companyId: "tenant-a", total: 100, status: "Cancelled" }); await expect(recordPayment("tenant-a", "invoice-1", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("Cancelled invoices"); });
  it("rejects another tenant's invoice without creating a payment", async () => { transaction(); mocks.findInvoice.mockResolvedValue(null); await expect(recordPayment("tenant-a", "invoice-b", { amount: 20, method: "Cash", paymentDate: new Date() })).rejects.toThrow("Invoice not found"); expect(mocks.create).not.toHaveBeenCalled(); });
});
