import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/audit/audit", () => ({ recordAuditEvent: vi.fn() }));
vi.mock("@/lib/audit/requestAudit", () => ({
  currentRequestId: vi.fn().mockResolvedValue("request-12345678"),
}));
const mocks = vi.hoisted(() => ({
  requireOperationalTenant: vi.fn(),
  requireTenantRole: vi.fn(),
  listEmployees: vi.fn(),
  createEmployee: vi.fn(),
}));
vi.mock("@/lib/auth/tenant", () => ({
  requireOperationalTenant: mocks.requireOperationalTenant,
  requireTenantRole: mocks.requireTenantRole,
}));
vi.mock("@/lib/crews/management", () => ({
  listEmployees: mocks.listEmployees,
  createEmployee: mocks.createEmployee,
}));
import { createEmployee, listEmployees } from "./management";

describe("crew management actions", () => {
  beforeEach(() => vi.clearAllMocks());
  it("resolves the authenticated tenant for employee lists", async () => {
    mocks.requireOperationalTenant.mockResolvedValue({
      companyId: "tenant-a",
      role: "Office",
    });
    mocks.listEmployees.mockResolvedValue({
      employees: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
    await listEmployees({ status: "Active" });
    expect(mocks.listEmployees).toHaveBeenCalledWith("tenant-a", {
      status: "Active",
    });
  });
  it("rejects suspended memberships before service access", async () => {
    mocks.requireOperationalTenant.mockRejectedValue(
      new Error("An active company membership is required."),
    );
    await expect(listEmployees()).rejects.toThrow("active company membership");
    expect(mocks.listEmployees).not.toHaveBeenCalled();
  });
  it("rejects unauthorized roles before employee administration", async () => {
    mocks.requireTenantRole.mockRejectedValue(
      new Error("Your company role cannot perform this action."),
    );
    await expect(
      createEmployee({ firstName: "A", lastName: "B", role: "CrewMember" }),
    ).rejects.toThrow("company role");
    expect(mocks.createEmployee).not.toHaveBeenCalled();
  });
});
