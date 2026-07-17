import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { companyMembership: { findFirst: vi.fn() } } }));
import { AuthorizationError, safeReturnUrl } from "./tenant";

describe("tenant authorization primitives", () => {
  it("rejects open redirect return URLs", () => { expect(safeReturnUrl("//evil.example")).toBe("/dashboard"); expect(safeReturnUrl("https://evil.example")).toBe("/dashboard"); expect(safeReturnUrl("/estimates")).toBe("/estimates"); });
  it("exposes typed authorization failures", () => { const error = new AuthorizationError("NO_ACTIVE_MEMBERSHIP", "No membership"); expect(error.code).toBe("NO_ACTIVE_MEMBERSHIP"); expect(error).toBeInstanceOf(Error); });
});
