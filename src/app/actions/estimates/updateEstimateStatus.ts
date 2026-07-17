"use server";

import {
  updateEstimateStatus,
  type EstimateWorkflowStatus,
} from "@/lib/estimates/updateEstimateStatus";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function updateEstimateStatusAction(
  estimateId: string,
  status: EstimateWorkflowStatus
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return updateEstimateStatus(companyId, estimateId, status);
}
