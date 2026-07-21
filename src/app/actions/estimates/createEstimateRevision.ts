"use server";

import { requireCompanyRole } from "@/lib/auth/tenant";
import { createEstimateRevision } from "@/lib/estimates/createEstimateRevision";

export async function createEstimateRevisionAction(estimateId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createEstimateRevision(companyId, estimateId);
}
