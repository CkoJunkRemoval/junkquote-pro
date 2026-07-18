"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { rebuildPricingOutcomes, syncPricingOutcomeForJob } from "@/lib/smartPricing/outcomes";
export async function syncPricingOutcomeForJobAction(jobId: string) { const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return syncPricingOutcomeForJob(companyId, jobId); }
export async function rebuildPricingOutcomesAction(options: { from?: Date; to?: Date; limit?: number } = {}) { const { companyId } = await requireCompanyRole("Owner", "Admin"); return rebuildPricingOutcomes(companyId, options); }
