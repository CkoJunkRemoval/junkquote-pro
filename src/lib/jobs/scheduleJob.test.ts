import { describe, expect, it, vi } from "vitest";

const { updateJob } = vi.hoisted(() => ({ updateJob: vi.fn() }));
vi.mock("./updateJob", () => ({ updateJob }));

import { scheduleJob } from "./scheduleJob";

describe("scheduleJob", () => {
  it("persists a valid drag/drop schedule through the validated job update", async () => {
    updateJob.mockResolvedValue({ id: "job-1" });
    await scheduleJob("company-a", { id: "job-1", scheduledStart: "2026-07-15T09:00:00.000Z", scheduledEnd: "2026-07-15T10:00:00.000Z" });
    expect(updateJob).toHaveBeenCalledWith("company-a", expect.objectContaining({ id: "job-1", scheduledStart: expect.any(Date), scheduledEnd: expect.any(Date) }));
  });

  it("rejects invalid drag/drop dates before persistence", async () => {
    await expect(scheduleJob("company-a", { id: "job-1", scheduledStart: "invalid", scheduledEnd: "invalid" })).rejects.toThrow("valid start and end date");
  });
});
