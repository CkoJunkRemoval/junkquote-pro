"use server";

import {
  prepareEstimateDelivery,
  type EstimateDeliveryMethod,
} from "@/lib/estimates/prepareEstimateDelivery";

export async function prepareEstimateDeliveryAction(
  estimateId: string,
  method: EstimateDeliveryMethod
) {
  return prepareEstimateDelivery(estimateId, method);
}
