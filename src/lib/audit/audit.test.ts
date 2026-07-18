import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const { create } = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { auditEvent: { create } } }));
import { recordAuditEvent } from "./audit";
describe("audit event creation", () => {
  beforeEach(() => create.mockReset().mockResolvedValue({ id: "a" }));
  it("sanitizes metadata before append", async () => {
    await recordAuditEvent({
      companyId: "c",
      eventType: "payment.created",
      metadata: { token: "raw", amount: 10 },
    });
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: "payment.created",
        metadata: { token: "[REDACTED]", amount: 10 },
      }),
    });
  });
});
