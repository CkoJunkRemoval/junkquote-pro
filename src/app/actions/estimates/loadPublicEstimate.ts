"use server";

import { getPublicEstimateByApprovalToken } from "@/lib/estimates/getPublicEstimateByApprovalToken";

export async function loadPublicEstimateAction(token: string) {
  return getPublicEstimateByApprovalToken(token);
}
