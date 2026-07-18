import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit/audit", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/audit/requestAudit", () => ({
  currentRequestId: vi.fn().mockResolvedValue("request-12345678"),
}));
const mocks = vi.hoisted(() => ({
  requireTenantContext: vi.fn(),
  requireAdminTenant: vi.fn(),
  getBranding: vi.fn(),
  updateBranding: vi.fn(),
}));
vi.mock("@/lib/auth/tenant", () => ({
  requireTenantContext: mocks.requireTenantContext,
  requireAdminTenant: mocks.requireAdminTenant,
}));
vi.mock("@/lib/company/branding", () => ({
  getCompanyBranding: mocks.getBranding,
  updateCompanyBranding: mocks.updateBranding,
}));
import { getCompanyBranding, updateCompanyBrandingAction } from "./branding";

describe("company branding actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("resolves authenticated tenant for shell branding", async () => {
    mocks.requireTenantContext.mockResolvedValue({
      companyId: "tenant-a",
      role: "Crew",
    });
    mocks.getBranding.mockResolvedValue({ id: "tenant-a" });
    await getCompanyBranding();
    expect(mocks.getBranding).toHaveBeenCalledWith("tenant-a");
  });
  it("allows only Owner/Admin settings writes", async () => {
    mocks.requireAdminTenant.mockResolvedValue({
      companyId: "tenant-a",
      role: "Owner",
      user: { id: "user-a" },
    });
    mocks.updateBranding.mockResolvedValue({ id: "tenant-a" });
    await updateCompanyBrandingAction({ displayName: "Acme" });
    expect(mocks.requireAdminTenant).toHaveBeenCalledOnce();
    expect(mocks.updateBranding).toHaveBeenCalledWith("tenant-a", {
      displayName: "Acme",
    });
  });
  it("rejects suspended memberships before reads", async () => {
    mocks.requireTenantContext.mockRejectedValue(
      new Error("An active company membership is required."),
    );
    await expect(getCompanyBranding()).rejects.toThrow(
      "active company membership",
    );
    expect(mocks.getBranding).not.toHaveBeenCalled();
  });
  it("rejects Manager/Office/Crew settings writes", async () => {
    mocks.requireAdminTenant.mockRejectedValue(
      new Error("Your company role cannot perform this action."),
    );
    await expect(
      updateCompanyBrandingAction({ displayName: "Nope" }),
    ).rejects.toThrow("company role");
    expect(mocks.updateBranding).not.toHaveBeenCalled();
  });
});
