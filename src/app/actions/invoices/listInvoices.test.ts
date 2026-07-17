import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireOperationalTenant: vi.fn(), listInvoices: vi.fn() }));
vi.mock("@/lib/auth/tenant", () => ({ requireOperationalTenant: mocks.requireOperationalTenant }));
vi.mock("@/lib/invoices/listInvoices", () => ({ listInvoices: mocks.listInvoices }));
import { listInvoicesAction } from "./listInvoices";

describe("listInvoicesAction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("resolves the authenticated company and never accepts a company ID", async () => {
    mocks.requireOperationalTenant.mockResolvedValue({ companyId: "tenant-a", role: "Office" });
    mocks.listInvoices.mockResolvedValue({ invoices: [], total: 0, page: 1, pageSize: 20 });
    await listInvoicesAction({ status: "Sent" });
    expect(listInvoicesAction).toHaveLength(0);
    expect(mocks.requireOperationalTenant).toHaveBeenCalledOnce();
    expect(mocks.listInvoices).toHaveBeenCalledWith("tenant-a", { status: "Sent" });
  });

  it("rejects suspended memberships before querying invoices", async () => {
    mocks.requireOperationalTenant.mockRejectedValue(new Error("An active company membership is required."));
    await expect(listInvoicesAction()).rejects.toThrow("active company membership");
    expect(mocks.listInvoices).not.toHaveBeenCalled();
  });

  it("rejects unauthorized roles before querying invoices", async () => {
    mocks.requireOperationalTenant.mockRejectedValue(new Error("Your company role cannot perform this action."));
    await expect(listInvoicesAction()).rejects.toThrow("company role");
    expect(mocks.listInvoices).not.toHaveBeenCalled();
  });
});
