import { beforeEach, describe, expect, it, vi } from "vitest";
const deliveryMocks = vi.hoisted(() => ({ begin: vi.fn(), failed: vi.fn(), sent: vi.fn() }));
vi.mock("@/lib/backgroundJobs/databaseQueue", () => ({ databaseJobQueue: {} }));
vi.mock("./delivery", () => ({
  beginDelivery: deliveryMocks.begin,
  markDeliveryFailed: deliveryMocks.failed,
  markDeliverySent: deliveryMocks.sent,
}));
import {
  enqueueCommunication,
  sendOrEnqueueCommunication,
} from "./queueCommunication";
describe("communication queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deliveryMocks.begin.mockResolvedValue({ id: "delivery-1" });
  });
  it("enqueues email and future SMS payloads", async () => {
    const queue = {
      enqueue: vi.fn().mockResolvedValue({ id: "job" }),
    } as never;
    await enqueueCommunication(
      "tenant-a",
      {
        channel: "email",
        to: "a@test.invalid",
        subject: "Hi",
        body: "Body",
        idempotencyKey: "email-1",
      },
      queue,
    );
    await enqueueCommunication(
      "tenant-a",
      {
        channel: "sms",
        to: "+15550100",
        body: "Body",
        idempotencyKey: "sms-1",
      },
      queue,
    );
    expect(
      (queue as { enqueue: ReturnType<typeof vi.fn> }).enqueue,
    ).toHaveBeenCalledTimes(2);
    expect(
      (queue as { enqueue: ReturnType<typeof vi.fn> }).enqueue,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: "tenant-a",
        type: "SendCommunication",
        idempotencyKey: "sms-1",
      }),
    );
  });
  it("preserves synchronous provider fallback until workers are enabled", async () => {
    const provider = {
      send: vi.fn().mockResolvedValue({ providerMessageId: "console-1" }),
    };
    const result = await sendOrEnqueueCommunication(
      "tenant-a",
      {
        channel: "email",
        to: "a@test.invalid",
        body: "Body",
        idempotencyKey: "email-1",
      },
      { workersEnabled: false, provider },
    );
    expect(result.mode).toBe("synchronous");
    expect(provider.send).toHaveBeenCalledOnce();
    expect(deliveryMocks.begin).toHaveBeenCalledBefore(provider.send);
    expect(provider.send).toHaveBeenCalledBefore(deliveryMocks.sent);
    expect(deliveryMocks.sent).toHaveBeenCalledWith("delivery-1", "console-1");
  });
  it("records a failed synchronous delivery without marking it sent", async () => {
    const error = new Error("provider failed");
    const provider = { send: vi.fn().mockRejectedValue(error) };
    await expect(sendOrEnqueueCommunication(
      "tenant-a",
      { channel: "email", to: "a@test.invalid", body: "Body", idempotencyKey: "email-failed" },
      { workersEnabled: false, provider },
    )).rejects.toThrow("provider failed");
    expect(deliveryMocks.failed).toHaveBeenCalledWith("delivery-1", error);
    expect(deliveryMocks.sent).not.toHaveBeenCalled();
  });
});
