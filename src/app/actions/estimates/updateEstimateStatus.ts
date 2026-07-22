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
  const { companyId,user } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); const label=[user.firstName,user.lastName].filter(Boolean).join(" ")||user.email; return updateEstimateStatus(companyId, estimateId, status,{actor:{label,userId:user.id}});
}
