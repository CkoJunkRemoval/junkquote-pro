import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requirePlatformAdmin: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/lib/admin/platformAuth", () => ({ requirePlatformAdmin: mocks.requirePlatformAdmin }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("next/headers", () => ({ headers: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/notifications/service", () => ({ createNotification: vi.fn() }));
vi.mock("@/lib/featureFlags/service", () => ({ validateRollout: vi.fn() }));

import { forceLogoutCompanyAction, retrySystemJobAction, setCompanyActiveAction } from "./admin";

describe("system administration actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePlatformAdmin.mockRejectedValue(new Error("Platform administrator access is required."));
  });
  it.each([
    ["suspend", () => setCompanyActiveAction("company-1", false)],
    ["force logout", () => forceLogoutCompanyAction("company-1")],
    ["retry", () => retrySystemJobAction("job-1")],
  ])("rejects direct unauthorized %s action invocation", async (_name, invoke) => {
    await expect(invoke()).rejects.toThrow("Platform administrator access is required");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
