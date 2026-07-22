import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findFirst: vi.fn(),
  updateJobRecord: vi.fn(),
  updateEstimate: vi.fn(),
}));
const transition=vi.hoisted(()=>vi.fn());

vi.mock("../prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
vi.mock("@/lib/estimates/estimateLifecycle",()=>({transitionEstimateInTransaction:transition}));

import { updateJob } from "./updateJob";

describe("updateJob scheduling", () => {
  it("turns an unscheduled job into Scheduled and synchronizes an approved estimate", async () => {
    const start = new Date("2026-07-20T09:00:00.000Z");
    const end = new Date("2026-07-20T10:00:00.000Z");
    mocks.transaction.mockImplementation(async (callback) => callback({
      job: { findFirst: mocks.findFirst, update: mocks.updateJobRecord },
      estimate: { update: mocks.updateEstimate },
    }));
    mocks.findFirst.mockResolvedValue({ id: "job-1", status: "Unscheduled", scheduledStart: null, estimateId: "estimate-1", estimate: { status: "Approved" } });
    mocks.updateJobRecord.mockResolvedValue({ id: "job-1", status: "Scheduled", scheduledStart: start, scheduledEnd: end });

    await updateJob("company-a", { id: "job-1", scheduledStart: start, scheduledEnd: end });

    expect(mocks.updateJobRecord).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: "Scheduled", scheduledStart: start, scheduledEnd: end }) }));
    expect(transition).toHaveBeenCalledWith(expect.any(Object),"company-a","estimate-1","Scheduled",expect.any(Object));
  });
});
