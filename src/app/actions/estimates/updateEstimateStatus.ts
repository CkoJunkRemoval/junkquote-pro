"use server";

import {
  updateEstimateStatus,
  type EstimateWorkflowStatus,
} from "@/lib/estimates/updateEstimateStatus";

export async function updateEstimateStatusAction(
  estimateId: string,
  status: EstimateWorkflowStatus
) {
  return updateEstimateStatus(estimateId, status);
}
