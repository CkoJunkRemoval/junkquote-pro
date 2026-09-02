import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/lib/errors/appError";

const mocks = vi.hoisted(() => ({
  requireOperationalTenant: vi.fn(),
  getInvoiceDetail: vi.fn(),
  sendInvoice: vi.fn(),
  recordAuditEvent: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers({ host: "app.test" })) }));
vi.mock("@/lib/auth/tenant", () => ({ requireOperationalTenant: mocks.requireOperationalTenant }));
vi.mock("@/lib/invoices/getInvoiceDetail", () => ({ getInvoiceDetail: mocks.getInvoiceDetail }));
vi.mock("@/lib/invoices/updateDraftInvoice", () => ({ updateDraftInvoice: vi.fn() }));
vi.mock("@/lib/invoices/sendInvoice", () => ({ sendInvoice: mocks.sendInvoice }));
vi.mock("@/lib/audit/audit", () => ({ recordAuditEvent: mocks.recordAuditEvent }));
vi.mock("@/lib/audit/requestAudit", () => ({ currentRequestId: vi.fn() }));

import { getInvoicePaymentLinkAction, sendInvoiceAction } from "./invoiceMutations";

describe("invoice payment-link action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireOperationalTenant.mockResolvedValue({
      companyId: "company-a",
      user: { id: "user-a" },
    });
  });
  it("does not query or return an invoice link when Crew authorization fails", async () => {
    mocks.requireOperationalTenant.mockRejectedValue(new Error("Your company role cannot perform this action."));
    await expect(getInvoicePaymentLinkAction("invoice-b")).rejects.toThrow("cannot perform");
    expect(mocks.getInvoiceDetail).not.toHaveBeenCalled();
  });

  it("returns success only after immediate invoice delivery succeeds", async () => {
    mocks.sendInvoice.mockResolvedValue({
      invoice: { id: "invoice-a", lastSentTo: "customer@example.com" },
      providerMessageId: "resend-message-1",
    });
    await expect(sendInvoiceAction("invoice-a", {
      recipient: "customer@example.com",
      subject: "Invoice",
      message: "Your invoice is ready.",
    })).resolves.toMatchObject({ ok: true, invoice: { id: "invoice-a" } });
    expect(mocks.sendInvoice).toHaveBeenCalledOnce();
    expect(mocks.recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      metadata: expect.objectContaining({ providerMessageId: "resend-message-1" }),
    }));
  });

  it("returns a safe delivery failure when the provider rejects the email", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.sendInvoice.mockRejectedValue(new AppError(
      "PROVIDER_FAILED",
      "Email provider rejected the message.",
      { providerStatus: 422 },
    ));
    await expect(sendInvoiceAction("invoice-a", {
      recipient: "customer@example.com",
      subject: "Invoice",
      message: "Your invoice is ready.",
    })).resolves.toEqual({
      ok: false,
      error: "We couldn't send this invoice email. Please try again.",
    });
    expect(mocks.recordAuditEvent).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Invoice email failed.", expect.objectContaining({
      code: "PROVIDER_FAILED",
      providerStatus: 422,
    }));
    log.mockRestore();
  });
});
