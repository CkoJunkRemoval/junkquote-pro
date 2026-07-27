import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string; email: string } },
  platformAdmin: false,
  audit: vi.fn(),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn(async () => state.session) }));
vi.mock("@/lib/security/rateLimit", () => ({ checkRateLimit: vi.fn(async () => ({ allowed: true })), ratePolicies: { systemAdmin: {} } }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  user: {
    count: vi.fn(async () => state.platformAdmin ? 1 : 0),
    updateMany: vi.fn(async () => ({ count: 0 })),
    findFirst: vi.fn(async () => state.platformAdmin ? { id: "user", email: state.session?.user.email, platformAdmin: true } : null),
  },
  auditEvent: { create: state.audit },
} }));
import { requirePlatformAdmin } from "./platformAuth";

describe("platform administrator authorization boundary", () => {
  beforeEach(() => { state.session = { user: { id: "user", email: "owner@tenant.test" } }; state.platformAdmin = false; state.audit.mockReset(); });
  it.each(["Owner", "Admin", "Manager", "Crew"])("denies an ordinary %s identity without the platform flag", async () => {
    await expect(requirePlatformAdmin()).rejects.toThrow("Platform administrator access");
  });
  it("fails closed for a customer or absent internal session", async () => {
    state.session = null;
    await expect(requirePlatformAdmin()).rejects.toThrow("sign-in is required");
  });
  it("allows an explicitly flagged administrator and audits access", async () => {
    state.platformAdmin = true;
    await expect(requirePlatformAdmin("platform_admin.test")).resolves.toMatchObject({ platformAdmin: true });
    expect(state.audit).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "platform_admin.test" }) });
  });
});
