import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { configuredPlatformAdminEmails, normalizeAdminEmail } from "./platformAuth";

describe("platform admin bootstrap", () => {
  it("normalizes bootstrap email", () =>
    expect(normalizeAdminEmail(" ADMIN@Example.COM ")).toBe("admin@example.com"));
  it("fails closed for an absent value", () =>
    expect(normalizeAdminEmail(undefined)).toBe(""));
  it("supports a normalized comma-separated allowlist", () =>
    expect([...configuredPlatformAdminEmails({ PLATFORM_ADMIN_EMAILS: " A@EXAMPLE.COM, b@example.com " } as unknown as NodeJS.ProcessEnv)])
      .toEqual(["a@example.com", "b@example.com"]));
});
