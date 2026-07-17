"use server";
import { updateJob, type UpdateJobInput } from "@/lib/jobs/updateJob";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function updateJobAction(input: UpdateJobInput) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return updateJob(companyId, input); }
