"use server";

import { getDraftEstimates } from "@/lib/estimates/getDraftEstimates";

export async function listDraftEstimatesAction(companyId: string) {
  return getDraftEstimates(companyId);
}
