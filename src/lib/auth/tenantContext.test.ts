import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), findMembership: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("react", async (importOriginal) => ({ ...(await importOriginal<typeof import("react")>()), cache: (fn: unknown) => fn }));
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { companyMembership: { findFirst: mocks.findMembership } } }));
import { AuthorizationError, requireAdminTenant, requireOperationalTenant, requireTenantContext } from "./tenant";

const membership = { id: "membership-a", role: "Owner", status: "Active", companyId: "tenant-a", company: { id: "tenant-a", name: "A" }, user: { id: "user-a", email: "a@test.invalid", firstName: "A", lastName: "Owner" } };
describe("typed tenant context", () => {
  beforeEach(() => vi.clearAllMocks());
  it("returns a fully typed context resolved from membership", async () => { mocks.auth.mockResolvedValue({ user: { id: "user-a" } }); mocks.findMembership.mockResolvedValue(membership); await expect(requireTenantContext()).resolves.toEqual({ user: membership.user, membership: { id: "membership-a", role: "Owner", status: "Active" }, company: membership.company, companyId: "tenant-a", role: "Owner" }); });
  it("preserves unauthenticated and suspended errors", async () => { mocks.auth.mockResolvedValue(null); await expect(requireTenantContext()).rejects.toMatchObject({ code: "UNAUTHENTICATED" }); mocks.auth.mockResolvedValue({ user: { id: "user-a" } }); mocks.findMembership.mockResolvedValue(null); await expect(requireTenantContext()).rejects.toMatchObject({ code: "NO_ACTIVE_MEMBERSHIP" }); });
  it("enforces operational and admin roles", async () => { mocks.auth.mockResolvedValue({ user: { id: "user-a" } }); mocks.findMembership.mockResolvedValue({ ...membership, role: "Office" }); await expect(requireOperationalTenant()).resolves.toMatchObject({ companyId: "tenant-a", role: "Office" }); await expect(requireAdminTenant()).rejects.toBeInstanceOf(AuthorizationError); });
});
