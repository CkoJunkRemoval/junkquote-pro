"use server";
import { createJobFromEstimate } from "@/lib/jobs/createJobFromEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { requireFeature } from "@/lib/billing/entitlements";
export async function createJobFromEstimateAction(estimateId: string) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); await requireFeature(companyId,"scheduling"); return createJobFromEstimate(companyId, estimateId); }
