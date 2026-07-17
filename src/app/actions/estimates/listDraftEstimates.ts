"use server";

import { getDraftEstimates } from "@/lib/estimates/getDraftEstimates";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function listDraftEstimatesAction() {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getDraftEstimates(companyId);
}
