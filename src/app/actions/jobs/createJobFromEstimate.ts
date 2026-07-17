"use server";
import { createJobFromEstimate } from "@/lib/jobs/createJobFromEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";
export async function createJobFromEstimateAction(estimateId: string) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return createJobFromEstimate(companyId, estimateId); }
