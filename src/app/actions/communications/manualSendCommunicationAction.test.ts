import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireRole: vi.fn(), send: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/auth/tenant", () => ({ requireCompanyRole: mocks.requireRole }));
vi.mock("@/lib/communications/engine", () => ({
  ensureDefaultCommunicationConfiguration: vi.fn(),
  manualSendCommunication: mocks.send,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/backgroundJobs/databaseQueue", () => ({ databaseJobQueue: {} }));
vi.mock("@/lib/communications/center", () => ({ markAllNotificationsRead: vi.fn(), markNotificationRead: vi.fn() }));
vi.mock("@/lib/communications/templates", () => ({ validateCommunicationTemplate: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));

import { manualSendCommunicationAction } from "./communications";

describe("manualSendCommunicationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireRole.mockResolvedValue({ companyId: "company-1", user: { id: "user-1" } });
    mocks.send.mockResolvedValue({ id: "delivery-1" });
  });

  it("uses the selected customer as the source for standalone manual email", async () => {
    const form = new FormData();
    form.set("sourceType", "Customer");
    form.set("sourceId", "");
    form.set("customerId", "customer-1");
    form.set("subject", "Hello");
    form.set("body", "Message");

    await expect(manualSendCommunicationAction({ ok: false, error: null }, form)).resolves.toEqual({ ok: true, error: null });
    expect(mocks.send).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1",
      actingUserId: "user-1",
      sourceType: "Customer",
      sourceId: "customer-1",
      customerId: "customer-1",
    }));
  });

  it("returns a safe visible error", async () => {
    mocks.send.mockRejectedValue(new Error("private provider detail"));
    const form = new FormData();

    await expect(manualSendCommunicationAction({ ok: false, error: null }, form)).resolves.toEqual({
      ok: false,
      error: "We couldn't send this email. Please try again.",
    });
  });
});
