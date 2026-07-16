"use server";

import { deleteEstimate } from "@/lib/estimates/deleteEstimate";

export async function deleteEstimateAction(estimateId: string) {
  return deleteEstimate(estimateId);
}
