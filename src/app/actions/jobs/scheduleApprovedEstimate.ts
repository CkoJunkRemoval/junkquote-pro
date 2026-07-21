"use server";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { scheduleApprovedEstimate, type ScheduleApprovedEstimateInput } from "@/lib/jobs/scheduleApprovedEstimate";
export async function scheduleApprovedEstimateAction(input: ScheduleApprovedEstimateInput) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return scheduleApprovedEstimate(companyId, input);
}
