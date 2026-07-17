"use server";
import { listJobs, type ListJobsInput } from "@/lib/jobs/listJobs";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function listJobsAction(input: ListJobsInput = {}) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return listJobs(companyId, input); }
