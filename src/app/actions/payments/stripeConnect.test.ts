import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminTenant: vi.fn(), companyFind: vi.fn(), companyUpdate: vi.fn(), auditCreate: vi.fn(), transaction: vi.fn(),
  accountCreate: vi.fn(), linkCreate: vi.fn(), sync: vi.fn(), redirect: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: vi.fn(async () => new Headers({ host: "localhost:3000", "x-forwarded-proto": "http" })) }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));
vi.mock("@/lib/auth/tenant", () => ({ requireAdminTenant: mocks.requireAdminTenant }));
vi.mock("@/lib/prisma", () => ({ prisma: { company: { findUniqueOrThrow: mocks.companyFind, update: mocks.companyUpdate }, auditEvent: { create: mocks.auditCreate }, $transaction: mocks.transaction } }));
vi.mock("@/lib/billing/stripe", () => ({ getStripeConnect: () => ({ accounts: { create: mocks.accountCreate }, accountLinks: { create: mocks.linkCreate } }) }));
vi.mock("@/lib/payments/stripeConnect", () => ({ retrieveAndSyncConnectedAccount: mocks.sync }));

import { refreshStripeConnectAction, returnFromStripeConnectAction, startStripeConnectAction } from "./stripeConnect";

describe("Stripe Connect management authorization and idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAdminTenant.mockResolvedValue({ companyId: "company-1", user: { id: "owner-1", email: "owner@example.com" } });
    mocks.companyFind.mockResolvedValue({ id: "company-1", name: "Hauling", displayName: "Hauling", email: null, website: null, phone: null, stripeConnectedAccountId: null, stripeConnectDisconnectedAt: null });
    mocks.accountCreate.mockResolvedValue({ id: "acct_1" });
    mocks.companyUpdate.mockResolvedValue({ id: "company-1", stripeConnectedAccountId: "acct_1" });
    mocks.linkCreate.mockResolvedValue({ url: "https://connect.stripe.test/onboard" });
    mocks.redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  });

  it("allows an Owner/Admin and creates one idempotent connected account", async () => {
    await expect(startStripeConnectAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.accountCreate).toHaveBeenCalledOnce();
    expect(mocks.accountCreate.mock.calls[0][1]).toEqual({ idempotencyKey: "connect-company-company-1" });
  });

  it("reuses an existing account on repeated clicks", async () => {
    mocks.companyFind.mockResolvedValue({ id: "company-1", stripeConnectedAccountId: "acct_existing", stripeConnectDisconnectedAt: null });
    await expect(startStripeConnectAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
    expect(mocks.linkCreate).toHaveBeenCalledWith(expect.objectContaining({ account: "acct_existing" }));
  });

  it("fails closed for Crew before calling Stripe", async () => {
    mocks.requireAdminTenant.mockRejectedValue(new Error("FORBIDDEN"));
    await expect(startStripeConnectAction()).rejects.toThrow("FORBIDDEN");
    expect(mocks.accountCreate).not.toHaveBeenCalled();
    expect(mocks.linkCreate).not.toHaveBeenCalled();
  });

  it("creates a fresh Account Link on refresh", async () => {
    mocks.companyFind.mockResolvedValue({ id: "company-1", stripeConnectedAccountId: "acct_existing" });
    await expect(refreshStripeConnectAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.linkCreate).toHaveBeenCalledOnce();
  });

  it("retrieves authoritative account state on return", async () => {
    await expect(returnFromStripeConnectAction()).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.sync).toHaveBeenCalledWith("company-1");
  });
});
