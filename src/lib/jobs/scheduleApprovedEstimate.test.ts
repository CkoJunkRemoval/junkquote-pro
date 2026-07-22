import { describe, expect, it, vi } from "vitest";
const tx = { estimate: { findFirst: vi.fn(), update: vi.fn() }, job: { findUnique: vi.fn(), create: vi.fn() }, crew: { findFirst: vi.fn() } };
const transition=vi.hoisted(()=>vi.fn());
vi.mock("../prisma", () => ({ prisma: { $transaction: vi.fn((callback) => callback(tx)) } }));
vi.mock("@/lib/estimates/estimateLifecycle",()=>({transitionEstimateInTransaction:transition}));
vi.mock("@/lib/estimates/estimateEvents",()=>({recordEstimateEventInTransaction:vi.fn()}));
import { scheduleApprovedEstimate } from "./scheduleApprovedEstimate";

describe("scheduleApprovedEstimate", () => {
  it("creates a numbered scheduled job with crew, truck, and notes", async () => {
    tx.estimate.findFirst.mockResolvedValue({ id: "estimate", status: "Approved", companyId: "company", customerId: "customer", propertyId: "property" });
    tx.job.findUnique.mockResolvedValue(null); tx.crew.findFirst.mockResolvedValue({ id: "crew" }); tx.job.create.mockResolvedValue({ id: "job", status: "Scheduled" });
    await scheduleApprovedEstimate("company", { estimateId: "estimate", scheduledStart: "2026-08-01T13:00:00Z", scheduledEnd: "2026-08-01T15:00:00Z", crewId: "crew", truck: "Truck 2", notes: "Gate code" });
    expect(tx.job.create).toHaveBeenCalledWith({ data: expect.objectContaining({ jobNumber: expect.stringMatching(/^JOB-/), status: "Scheduled", truck: "Truck 2", crewNotes: "Gate code", assignments: { create: { companyId: "company", crewId: "crew" } } }) });
    expect(transition).toHaveBeenCalledWith(tx,"company","estimate","Scheduled",expect.any(Object));
  });
  it("rejects invalid windows and non-approved estimates", async () => {
    await expect(scheduleApprovedEstimate("company", { estimateId: "estimate", scheduledStart: "bad", scheduledEnd: "bad" })).rejects.toThrow("valid job start");
    tx.estimate.findFirst.mockResolvedValue({ id: "estimate", status: "Sent" });
    await expect(scheduleApprovedEstimate("company", { estimateId: "estimate", scheduledStart: "2026-08-01T13:00:00Z", scheduledEnd: "2026-08-01T15:00:00Z" })).rejects.toThrow("approved estimate");
  });
});
