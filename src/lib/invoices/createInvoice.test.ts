import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findEstimate: vi.fn(), findInvoice: vi.fn(), findLatest: vi.fn(), findCompany: vi.fn(), createInvoice: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { createInvoice } from "./createInvoice";

const approvedEstimate = { id: "estimate-1", companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa", customerId: "customer-1", propertyId: "property-1", status: "Approved", pricingSubtotal: 100, pricingLabor: 25, pricingDisposal: 10, pricingDiscount: 5, pricingTotal: 130 };

describe("createInvoice", () => {
  function transactionMock() { mocks.transaction.mockImplementation(async (callback) => callback({ estimate: { findFirst: mocks.findEstimate }, invoice: { findUnique: mocks.findInvoice, findFirst: mocks.findLatest, create: mocks.createInvoice }, company: { findFirst: mocks.findCompany } })); }
  beforeEach(() => { vi.clearAllMocks(); });
  it("creates an invoice with snapshotted historical totals", async () => {
    transactionMock(); mocks.findEstimate.mockResolvedValue(approvedEstimate); mocks.findInvoice.mockResolvedValue(null); mocks.findLatest.mockResolvedValue({ invoiceNumber: 7 }); mocks.findCompany.mockResolvedValue({ invoicePrefix: "INV", defaultPaymentTermsDays: 30 }); mocks.createInvoice.mockResolvedValue({ id: "invoice-1" });
    await createInvoice({ estimateId: "estimate-1" });
    expect(mocks.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ invoiceNumber: 8, displayNumber: "INV-8", subtotal: 135, tax: 0, discounts: 5, total: 130, balanceDue: 130 }) }));
  });
  it("prevents a duplicate invoice for an estimate", async () => {
    transactionMock(); mocks.findEstimate.mockResolvedValue(approvedEstimate); mocks.findInvoice.mockResolvedValue({ id: "invoice-1" });
    await expect(createInvoice({ estimateId: "estimate-1" })).rejects.toThrow("invoice already exists");
    expect(mocks.createInvoice).not.toHaveBeenCalled();
  });
});
