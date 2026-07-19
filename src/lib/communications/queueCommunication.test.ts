import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/backgroundJobs/databaseQueue", () => ({ databaseJobQueue: {} }));
vi.mock("./delivery", () => ({
  beginDelivery: vi.fn(),
  markDeliveryFailed: vi.fn(),
  markDeliverySent: vi.fn(),
}));
import {
  enqueueCommunication,
  sendOrEnqueueCommunication,
} from "./queueCommunication";
describe("communication queue", () => {
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
  });
});
