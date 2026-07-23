import type { JobListStatus } from "@/lib/jobs/listJobs";

export type JobManagementFilter = "All" | JobListStatus;
export type JobManagementPeriod = "Today" | undefined;

export const jobManagementFilters: readonly JobManagementFilter[] = [
  "All",
  "Unscheduled",
  "Scheduled",
  "InProgress",
  "Completed",
  "Cancelled",
];

export function parseJobManagementFilter(
  raw: string | null | undefined,
): JobManagementFilter {
  return jobManagementFilters.includes(raw as JobManagementFilter)
    ? (raw as JobManagementFilter)
    : "All";
}

export function parseJobManagementPeriod(
  raw: string | null | undefined,
): JobManagementPeriod {
  return raw === "Today" ? "Today" : undefined;
}
