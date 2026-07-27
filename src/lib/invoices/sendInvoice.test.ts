import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findInvoice: vi.fn(),
  updateInvoice: vi.fn(),
  recordEvent: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("../prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/estimates/estimateEvents", () => ({ recordEstimateEventInTransaction: mocks.recordEvent }));
vi.mock("@/lib/communications/engine", () => ({ emitCommunicationEventForSource: mocks.emit }));

import { sendInvoice } from "./sendInvoice";

describe("sendInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.transaction.mockImplementation(async (callback) => callback({
      invoice: { findFirst: mocks.findInvoice, update: mocks.updateInvoice },
    }));
  });

  it("records the tenant-scoped invoice timeline and audit event before delivery", async () => {
    mocks.findInvoice.mockResolvedValue({ id: "invoice-1", displayNumber: "INV-1", status: "Draft", estimateId: "estimate-1", customer: { email: "customer@example.com" } });
    mocks.updateInvoice.mockResolvedValue({ id: "invoice-1", status: "Sent", lastSentTo: "customer@example.com" });

    await sendInvoice("company-1", "invoice-1", "https://app.example.com", "user-1");

    expect(mocks.findInvoice).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "invoice-1", companyId: "company-1" }) }));
    expect(mocks.recordEvent).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({
      companyId: "company-1",
      estimateId: "estimate-1",
      eventType: "Invoice Sent",
      actor: expect.objectContaining({ userId: "user-1" }),
    }));
    expect(mocks.emit).toHaveBeenCalledWith(expect.objectContaining({ companyId: "company-1", sourceId: "invoice-1" }));
  });
});
