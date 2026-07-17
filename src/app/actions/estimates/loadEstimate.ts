"use server";

import { getEstimate } from "@/lib/estimates/getEstimate";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function loadEstimateAction(estimateId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return getEstimate(companyId, estimateId);
}
