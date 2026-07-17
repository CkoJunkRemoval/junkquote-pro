"use server";
import { getJobDetail } from "@/lib/jobs/getJobDetail";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function getJobDetailAction(jobId: string) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return getJobDetail(companyId, jobId); }
