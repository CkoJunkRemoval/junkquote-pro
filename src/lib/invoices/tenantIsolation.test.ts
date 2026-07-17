import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findInvoice: vi.fn(), updateInvoice: vi.fn() }));
vi.mock("../prisma", () => ({ prisma: { invoice: { findFirst: mocks.findInvoice, update: mocks.updateInvoice } } }));
import { getInvoiceDetail, getInvoicePdfData } from "./getInvoiceDetail";
import { updateInvoiceStatus } from "./updateInvoiceStatus";

describe("invoice tenant isolation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns not found for another tenant's invoice detail and PDF", async () => {
    mocks.findInvoice.mockResolvedValue(null);
    await expect(getInvoiceDetail("tenant-a", "invoice-b")).resolves.toBeNull();
    await expect(getInvoicePdfData("tenant-a", "invoice-b")).resolves.toBeNull();
    expect(mocks.findInvoice).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "invoice-b", companyId: "tenant-a" }) }));
  });

  it("does not update another tenant's invoice", async () => {
    mocks.findInvoice.mockResolvedValue(null);
    await expect(updateInvoiceStatus("tenant-a", "invoice-b", "Sent")).rejects.toThrow("Invoice not found");
    expect(mocks.updateInvoice).not.toHaveBeenCalled();
  });
});
