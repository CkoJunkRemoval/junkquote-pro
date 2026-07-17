import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ findMany: vi.fn(), findInvoice: vi.fn(), findPayment: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { invoice: { findFirst: mocks.findInvoice }, payment: { findMany: mocks.findMany, findFirst: mocks.findPayment } } }));
import { getPaymentReceiptData, listInvoicePayments } from "./listInvoicePayments";

describe("invoice payment list", () => {
  beforeEach(() => vi.clearAllMocks());
  it("keeps payment listing tenant scoped", async () => { mocks.findInvoice.mockResolvedValue({ id: "invoice-1" }); mocks.findMany.mockResolvedValue([]); await listInvoicePayments("tenant-a", "invoice-1"); expect(mocks.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ invoiceId: "invoice-1", companyId: "tenant-a" }) })); });
  it("does not list payments when the invoice is outside the tenant", async () => { mocks.findInvoice.mockResolvedValue(null); await expect(listInvoicePayments("tenant-a", "invoice-b")).rejects.toThrow("Invoice not found"); expect(mocks.findMany).not.toHaveBeenCalled(); });
  it("isolates receipt lookup to payment and invoice tenant", async () => { mocks.findPayment.mockResolvedValue(null); await expect(getPaymentReceiptData("tenant-a", "payment-b")).resolves.toBeNull(); expect(mocks.findPayment).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "payment-b", companyId: "tenant-a", invoice: expect.objectContaining({ companyId: "tenant-a" }) }) })); });
});
