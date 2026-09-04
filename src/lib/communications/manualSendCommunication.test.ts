import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  customer: vi.fn(),
  job: vi.fn(),
  event: vi.fn(),
  updateDelivery: vi.fn(),
  deliver: vi.fn(),
  providerSend: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customer: { findFirst: mocks.customer },
    job: { findFirst: mocks.job },
    estimate: { findFirst: vi.fn() },
    invoice: { findFirst: vi.fn() },
    communicationEvent: { create: mocks.event },
    communicationDelivery: { update: mocks.updateDelivery },
  },
}));
vi.mock("./provider", () => ({
  selectCommunicationProvider: () => ({ name: "resend", send: mocks.providerSend }),
}));
vi.mock("./queueCommunication", () => ({
  enqueueCommunication: vi.fn(),
  sendOrEnqueueCommunication: mocks.deliver,
}));
vi.mock("./delivery", () => ({ beginDelivery: vi.fn(), markDeliveryFailed: vi.fn() }));

import { manualSendCommunication } from "./engine";

describe("manual communication delivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.customer.mockResolvedValue({ id: "customer-1", email: "customer@example.com" });
    mocks.job.mockResolvedValue({ id: "job-1" });
    mocks.event.mockResolvedValue({ id: "event-1" });
    mocks.updateDelivery.mockResolvedValue({ id: "delivery-1", status: "Sent" });
    mocks.deliver.mockImplementation(async (_companyId, _message, options) => ({
      mode: "synchronous",
      result: await options.provider.send({}, {}),
      delivery: { id: "delivery-1" },
    }));
    mocks.providerSend.mockResolvedValue({ providerMessageId: "resend-1", providerStatus: 200 });
  });

  it("validates tenancy and calls the immediate provider exactly once", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await manualSendCommunication({
      companyId: "company-1",
      actingUserId: "user-1",
      sourceType: "Job",
      sourceId: "job-1",
      customerId: "customer-1",
      subject: "Hello",
      body: "Message",
    });

    expect(mocks.customer).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "customer-1", companyId: "company-1" } }));
    expect(mocks.job).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: "job-1", companyId: "company-1", customerId: "customer-1" }) }));
    expect(mocks.deliver).toHaveBeenCalledWith("company-1", expect.objectContaining({ channel: "email" }), expect.objectContaining({ workersEnabled: false }));
    expect(mocks.providerSend).toHaveBeenCalledOnce();
    expect(info.mock.calls.join(" ")).toContain("COMMUNICATION_MANUAL_PROVIDER_ACCEPTED");
    info.mockRestore();
  });

  it("rejects cross-tenant sources before provider delivery", async () => {
    mocks.job.mockResolvedValue(null);
    await expect(manualSendCommunication({
      companyId: "company-1",
      actingUserId: "user-1",
      sourceType: "Job",
      sourceId: "other-job",
      customerId: "customer-1",
      subject: "Hello",
      body: "Message",
    })).rejects.toThrow("not authorized");
    expect(mocks.deliver).not.toHaveBeenCalled();
    expect(mocks.providerSend).not.toHaveBeenCalled();
  });
});
