import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  updateInvoice: vi.fn(),
  getInvoice: vi.fn(),
  recordEvent: vi.fn(),
  deliver: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/invoices/getInvoiceDetail", () => ({ getInvoiceDetail: mocks.getInvoice }));
vi.mock("@/lib/estimates/estimateEvents", () => ({ recordEstimateEventInTransaction: mocks.recordEvent }));
vi.mock("@/lib/communications/queueCommunication", () => ({ sendOrEnqueueCommunication: mocks.deliver }));

import { sendInvoice } from "./sendInvoice";

const invoice = {
  id: "invoice-1",
  invoiceNumber: 1,
  displayNumber: "INV-1",
  status: "Draft",
  balanceDue: 125,
  dueDate: new Date("2026-09-15T12:00:00Z"),
  company: { name: "Junk Co", displayName: "Junk Co" },
  customer: { firstName: "Jamie", email: "saved@example.com" },
  estimate: { id: "estimate-1" },
} as never;

describe("sendInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getInvoice.mockResolvedValue(invoice);
    mocks.deliver.mockResolvedValue({ mode: "synchronous", result: { providerMessageId: "provider-1" } });
    mocks.updateInvoice.mockResolvedValue({ id: "invoice-1", status: "Sent", lastSentTo: "recipient@example.com" });
    mocks.transaction.mockImplementation(async (callback) => callback({ invoice: { update: mocks.updateInvoice } }));
  });

  it("sends reviewed tenant invoice data and records sent state after acceptance", async () => {
    const renderPdf = vi.fn().mockResolvedValue("base64-pdf");
    await sendInvoice("company-1", "invoice-1", "https://app.example.com", "user-1", {
      recipient: "recipient@example.com",
      subject: "Your invoice",
      message: "Thanks for your business.",
    }, { renderPdf, id: () => "attempt-1" });

    expect(mocks.getInvoice).toHaveBeenCalledWith("company-1", "invoice-1");
    expect(renderPdf).toHaveBeenCalledWith(invoice);
    expect(mocks.deliver).toHaveBeenCalledWith("company-1", expect.objectContaining({
      to: "recipient@example.com",
      subject: "Your invoice",
      body: expect.stringContaining("https://app.example.com/portal/invoices/invoice-1"),
      attachments: [{ filename: "Invoice-INV-1.pdf", content: "base64-pdf", contentType: "application/pdf" }],
    }), expect.objectContaining({ workersEnabled: false }));
    expect(mocks.updateInvoice).toHaveBeenCalledAfter(mocks.deliver);
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      companyId: "company-1",
      estimateId: "estimate-1",
      metadata: expect.objectContaining({ providerMessageId: "provider-1" }),
    }));
  });

  it("does not mark the invoice sent when the provider fails", async () => {
    mocks.deliver.mockRejectedValue(new Error("provider unavailable"));
    await expect(sendInvoice("company-1", "invoice-1", "https://app.example.com", "user-1", {
      recipient: "recipient@example.com", subject: "Invoice", message: "Ready.",
    }, { renderPdf: vi.fn().mockResolvedValue("pdf") })).rejects.toThrow("provider unavailable");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.recordEvent).not.toHaveBeenCalled();
  });

  it.each(["", "not-an-email"])("rejects invalid recipient %j before delivery", async (recipient) => {
    await expect(sendInvoice("company-1", "invoice-1", "https://app.example.com", "user-1", {
      recipient, subject: "Invoice", message: "Ready.",
    })).rejects.toMatchObject({ code: "VALIDATION_FAILED" });
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it("does not reveal an invoice outside the tenant", async () => {
    mocks.getInvoice.mockResolvedValue(null);
    await expect(sendInvoice("other-company", "invoice-1", "https://app.example.com", "user-1", {
      recipient: "recipient@example.com", subject: "Invoice", message: "Ready.",
    })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
