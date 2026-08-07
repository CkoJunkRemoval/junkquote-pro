import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireOperationalTenant: vi.fn(), getInvoiceDetail: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers({ host: "app.test" })) }));
vi.mock("@/lib/auth/tenant", () => ({ requireOperationalTenant: mocks.requireOperationalTenant }));
vi.mock("@/lib/invoices/getInvoiceDetail", () => ({ getInvoiceDetail: mocks.getInvoiceDetail }));
vi.mock("@/lib/invoices/updateDraftInvoice", () => ({ updateDraftInvoice: vi.fn() }));
vi.mock("@/lib/invoices/sendInvoice", () => ({ sendInvoice: vi.fn() }));
vi.mock("@/lib/audit/audit", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/audit/requestAudit", () => ({ currentRequestId: vi.fn() }));

import { getInvoicePaymentLinkAction } from "./invoiceMutations";

describe("invoice payment-link action authorization", () => {
  it("does not query or return an invoice link when Crew authorization fails", async () => {
    mocks.requireOperationalTenant.mockRejectedValue(new Error("Your company role cannot perform this action."));
    await expect(getInvoicePaymentLinkAction("invoice-b")).rejects.toThrow("cannot perform");
    expect(mocks.getInvoiceDetail).not.toHaveBeenCalled();
  });
});
