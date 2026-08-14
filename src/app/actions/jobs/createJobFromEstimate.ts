"use server";
import { createJobFromEstimate } from "@/lib/jobs/createJobFromEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { requireFeature } from "@/lib/billing/entitlements";
export async function createJobFromEstimateAction(estimateId: string) { const { companyId,role } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); await requireFeature(companyId,"scheduling",role); return createJobFromEstimate(companyId, estimateId); }
