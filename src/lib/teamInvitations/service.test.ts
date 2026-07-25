import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  provider: { send: vi.fn().mockResolvedValue({ providerMessageId: "email-1" }) },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/communications/provider", () => ({ selectCommunicationProvider: () => mocks.provider }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/notifications/service", () => ({ createNotification: vi.fn() }));

import { generateInvitationToken, hashInvitationToken, invitationLifetimeMs } from "./service";

describe("team invitation token primitives", () => {
  beforeEach(() => vi.clearAllMocks());

  it("generates high-entropy, URL-safe, non-repeatable tokens", () => {
    const first = generateInvitationToken();
    const second = generateInvitationToken();
    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(second).not.toBe(first);
  });

  it("stores only a deterministic SHA-256 token hash", () => {
    const token = generateInvitationToken();
    const hash = hashInvitationToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
  });

  it("uses a seven-day invitation lifetime", () => {
    expect(invitationLifetimeMs).toBe(7 * 24 * 60 * 60_000);
  });
});
