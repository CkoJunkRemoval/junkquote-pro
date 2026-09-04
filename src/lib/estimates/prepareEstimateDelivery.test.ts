import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";

const mocks = vi.hoisted(() => ({
  findEstimate: vi.fn(),
  transaction: vi.fn(),
  transition: vi.fn(),
  deliver: vi.fn(),
  emit: vi.fn(),
}));

vi.mock("../prisma", () => ({
  prisma: {
    estimate: { findFirst: mocks.findEstimate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("./approvalToken", () => ({ generateApprovalToken: () => "secure-token" }));
vi.mock("./estimateLifecycle", () => ({
  transitionEstimateInTransaction: mocks.transition,
}));
vi.mock("@/lib/communications/queueCommunication", () => ({
  sendOrEnqueueCommunication: mocks.deliver,
}));
vi.mock("@/lib/communications/engine", () => ({
  emitCommunicationEventForSource: mocks.emit,
}));

import { prepareEstimateDelivery } from "./prepareEstimateDelivery";

describe("manual estimate email delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    mocks.findEstimate.mockResolvedValue({
      id: "estimate-1",
      displayNumber: "EST-1",
      pricingTotal: 125,
      customer: { email: "customer@example.com", firstName: "Jamie" },
      company: { displayName: "Junk Co", name: "Junk Co" },
    });
    mocks.deliver.mockResolvedValue({
      mode: "synchronous",
      result: { providerMessageId: "resend-1" },
    });
    mocks.transaction.mockImplementation(async (callback) => callback({}));
  });

  it("uses the immediate provider path and secure public approval link", async () => {
    const result = await prepareEstimateDelivery(
      "company-1",
      "estimate-1",
      "email",
      "user-1",
      { id: () => "attempt-1", now: () => new Date("2026-09-04T12:00:00Z") },
    );

    expect(mocks.findEstimate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "estimate-1", companyId: "company-1", customer: { companyId: "company-1" } },
    }));
    expect(mocks.deliver).toHaveBeenCalledWith(
      "company-1",
      expect.objectContaining({
        channel: "email",
        to: "customer@example.com",
        body: expect.stringContaining("https://app.example.com/approve/secure-token"),
        createdByUserId: "user-1",
      }),
      expect.objectContaining({ workersEnabled: false }),
    );
    expect(mocks.deliver).toHaveBeenCalledBefore(mocks.transition);
    expect(mocks.transition).toHaveBeenCalledWith(
      expect.anything(),
      "company-1",
      "estimate-1",
      "Sent",
      expect.objectContaining({ metadata: { method: "email", providerMessageId: "resend-1" } }),
    );
    expect(mocks.emit).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      approvalUrl: "https://app.example.com/approve/secure-token",
      providerMessageId: "resend-1",
    });
  });

  it("does not mark the estimate sent when the provider fails", async () => {
    mocks.deliver.mockRejectedValue(new Error("provider unavailable"));

    await expect(prepareEstimateDelivery(
      "company-1",
      "estimate-1",
      "email",
      "user-1",
    )).rejects.toThrow("provider unavailable");
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.transition).not.toHaveBeenCalled();
  });

  it("denies cross-tenant estimates before provider delivery", async () => {
    mocks.findEstimate.mockResolvedValue(null);

    await expect(prepareEstimateDelivery(
      "company-a",
      "estimate-from-company-b",
      "email",
      "user-1",
    )).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.deliver).not.toHaveBeenCalled();
  });

  it("does not show the stale disconnected warning for configured delivery", () => {
    const source = readFileSync(
      new URL("../../features/estimate/ready/EstimateReady.tsx", import.meta.url),
      "utf8",
    );

    expect(source).not.toContain("Email delivery is not connected yet");
    expect(source).toContain("Estimate email sent successfully.");
  });
});
