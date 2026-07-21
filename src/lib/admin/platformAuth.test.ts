import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { normalizeAdminEmail } from "./platformAuth";

describe("platform admin bootstrap", () => {
  it("normalizes bootstrap email", () =>
    expect(normalizeAdminEmail(" ADMIN@Example.COM ")).toBe("admin@example.com"));
  it("fails closed for an absent value", () =>
    expect(normalizeAdminEmail(undefined)).toBe(""));
});
