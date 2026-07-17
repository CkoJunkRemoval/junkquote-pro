import { describe, expect, it, vi } from "vitest";
vi.mock("@/app/actions/jobs/getCalendarJobs", () => ({ getCalendarJobsAction: vi.fn(), getUnscheduledCalendarJobsAction: vi.fn() }));
vi.mock("@/app/actions/jobs/scheduleJob", () => ({ scheduleJobAction: vi.fn() }));
vi.mock("@/app/actions/crews/management", () => ({ listCrews: vi.fn() }));
import { getJobConflicts } from "./SchedulingCalendar";
import { findAssignmentConflicts } from "@/lib/crews/overlap";

const conflict = { jobId: "job-a", otherJobId: "job-b", otherJobName: "Job B", start: new Date("2026-07-01T10:00:00Z"), end: new Date("2026-07-01T11:00:00Z"), employeeIds: ["employee"], crewIds: [] };
describe("calendar conflict matching", () => { it("matches both job keys and excludes unrelated jobs", () => { expect(getJobConflicts("job-a", [conflict])).toEqual([conflict]); expect(getJobConflicts("job-b", [conflict])).toEqual([conflict]); expect(getJobConflicts("job-c", [conflict])).toEqual([]); }); it("does not flag adjacent jobs", () => expect(findAssignmentConflicts([{ jobId: "a", jobName: "A", start: new Date("2026-07-01T09:00Z"), end: new Date("2026-07-01T10:00Z"), employeeIds: ["e"], crewIds: [] }, { jobId: "b", jobName: "B", start: new Date("2026-07-01T10:00Z"), end: new Date("2026-07-01T11:00Z"), employeeIds: ["e"], crewIds: [] }])).toEqual([])); });
