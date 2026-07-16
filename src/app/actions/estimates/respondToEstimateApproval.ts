"use server";

import {
  respondToEstimateApproval,
  type PublicEstimateResponse,
} from "@/lib/estimates/respondToEstimateApproval";

export async function respondToEstimateApprovalAction(
  token: string,
  response: PublicEstimateResponse
) {
  return respondToEstimateApproval(token, response);
}
