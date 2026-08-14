import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireTenantContext: vi.fn(), canAccessFeature: vi.fn(async () => true), forbidden: vi.fn(() => { throw new Error("NEXT_FORBIDDEN"); }) }));
vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({ forbidden: mocks.forbidden }));
vi.mock("./tenant", () => ({
  AuthorizationError: class AuthorizationError extends Error {
    constructor(public code: "UNAUTHENTICATED" | "NO_ACTIVE_MEMBERSHIP" | "FORBIDDEN", message: string) { super(message); }
  },
  requireTenantContext: mocks.requireTenantContext,
}));
vi.mock("@/lib/billing/entitlements", () => ({ canAccessFeature: mocks.canAccessFeature }));

import { AuthorizationError } from "./tenant";
import { requireCompanyModulePage } from "./pageAccess";

const context = (role: "Owner" | "Admin" | "Crew") => ({ companyId: "company-a", role, membership: { billingAdmin: false } });

describe("company module page authorization", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["Owner", "Admin"] as const)("allows %s invoice detail access", async role => {
    mocks.requireTenantContext.mockResolvedValue(context(role));
    await expect(requireCompanyModulePage("invoices")).resolves.toMatchObject({ companyId: "company-a", role });
    expect(mocks.forbidden).not.toHaveBeenCalled();
  });
  it("converts a Crew page denial into the controlled forbidden boundary", async () => {
    mocks.requireTenantContext.mockResolvedValue(context("Crew"));
    await expect(requireCompanyModulePage("invoices")).rejects.toThrow("NEXT_FORBIDDEN");
    expect(mocks.forbidden).toHaveBeenCalledOnce();
  });
  it("passes the membership role into paid feature gates", async () => { mocks.requireTenantContext.mockResolvedValue(context("Owner")); await requireCompanyModulePage("finance"); expect(mocks.canAccessFeature).toHaveBeenCalledWith("company-a", "finance", "Owner"); });
  it("converts an authenticated membership failure into controlled forbidden", async () => {
    mocks.requireTenantContext.mockRejectedValue(new AuthorizationError("NO_ACTIVE_MEMBERSHIP", "Membership required"));
    await expect(requireCompanyModulePage("invoices")).rejects.toThrow("NEXT_FORBIDDEN");
  });
  it("leaves unauthenticated handling to the central sign-in middleware", async () => {
    const error = new AuthorizationError("UNAUTHENTICATED", "Sign in required");
    mocks.requireTenantContext.mockRejectedValue(error);
    await expect(requireCompanyModulePage("invoices")).rejects.toBe(error);
    expect(mocks.forbidden).not.toHaveBeenCalled();
  });
});
