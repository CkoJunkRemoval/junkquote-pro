"use server";

import { deleteEstimate } from "@/lib/estimates/deleteEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function deleteEstimateAction(estimateId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return deleteEstimate(companyId, estimateId);
}
