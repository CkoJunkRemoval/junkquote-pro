"use server";

import { getCalendarJobs, getUnscheduledCalendarJobs } from "@/lib/jobs/getCalendarJobs";
import type { JobWorkflowStatus } from "@/lib/jobs/statusWorkflow";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getCalendarJobsAction(input: { start: string; end: string; statuses?: JobWorkflowStatus[]; search?: string; crewId?: string }) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return getCalendarJobs(companyId, { ...input, start: new Date(input.start), end: new Date(input.end) });
}

export async function getUnscheduledCalendarJobsAction(search?: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return getUnscheduledCalendarJobs(companyId, search);
}
