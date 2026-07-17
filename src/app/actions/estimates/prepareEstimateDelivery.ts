"use server";

import {
  prepareEstimateDelivery,
  type EstimateDeliveryMethod,
} from "@/lib/estimates/prepareEstimateDelivery";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function prepareEstimateDeliveryAction(
  estimateId: string,
  method: EstimateDeliveryMethod
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office"); return prepareEstimateDelivery(companyId, estimateId, method);
}
