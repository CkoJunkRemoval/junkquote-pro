import { describe, expect, it, vi } from "vitest";
vi.mock("./databaseQueue", () => ({ databaseJobQueue: {} }));
vi.mock("./handlers", () => ({ createBackgroundJobHandlers: () => ({}) }));
import type { BackgroundJob } from "@/generated/prisma/client";
import { OneShotJobWorker } from "./worker";

const job = { id: "job-1", companyId: "tenant-a", type: "Future", status: "Running", priority: "Normal", payload: {}, attempts: 1, maxAttempts: 3 } as BackgroundJob;
describe("one-shot job worker", () => {
  it("completes a reserved job exactly once", async () => { const handler = vi.fn().mockResolvedValue(undefined); const queue = { reserve: vi.fn().mockResolvedValueOnce(job).mockResolvedValueOnce(null), complete: vi.fn().mockResolvedValue({ ...job, status: "Completed" }), fail: vi.fn(), recoverStale: vi.fn(), enqueue: vi.fn(), retry: vi.fn(), cancel: vi.fn() }; const worker = new OneShotJobWorker(queue, { Future: handler }, { log: vi.fn() }); await worker.processOne(); await worker.processOne(); expect(handler).toHaveBeenCalledOnce(); expect(queue.complete).toHaveBeenCalledOnce(); });
  it("fails through the queue and preserves retry decisions", async () => { const queue = { reserve: vi.fn().mockResolvedValue(job), complete: vi.fn(), fail: vi.fn().mockResolvedValue({ ...job, status: "Pending" }), recoverStale: vi.fn(), enqueue: vi.fn(), retry: vi.fn(), cancel: vi.fn() }; const worker = new OneShotJobWorker(queue, { Future: vi.fn().mockRejectedValue(new Error("boom")) }, { log: vi.fn() }); await expect(worker.processOne()).resolves.toMatchObject({ status: "Pending" }); expect(queue.fail).toHaveBeenCalledWith("tenant-a", "job-1", expect.objectContaining({ error: expect.any(Error) })); });
  it("supports graceful shutdown before reservation", async () => { const queue = { reserve: vi.fn(), complete: vi.fn(), fail: vi.fn(), recoverStale: vi.fn(), enqueue: vi.fn(), retry: vi.fn(), cancel: vi.fn() }; const worker = new OneShotJobWorker(queue, {}, { log: vi.fn() }); worker.shutdown(); await expect(worker.processOne()).resolves.toBeNull(); expect(queue.reserve).not.toHaveBeenCalled(); });
});
