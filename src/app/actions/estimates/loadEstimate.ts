"use server";

import { getEstimate } from "@/lib/estimates/getEstimate";

export async function loadEstimateAction(estimateId: string) {
  return getEstimate(estimateId);
}
