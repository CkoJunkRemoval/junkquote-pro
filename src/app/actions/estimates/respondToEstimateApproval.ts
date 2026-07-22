"use server";

import {
  respondToEstimateApproval,
  type PublicEstimateResponse,
} from "@/lib/estimates/respondToEstimateApproval";
import { createHash } from "node:crypto";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { AppError } from "@/lib/errors/appError";

export async function respondToEstimateApprovalAction(
  token: string,
  response: PublicEstimateResponse,
  signerName?: string,
  signatureData?: string,
) {
  const identity = createHash("sha256").update(token).digest("hex");
  if (
    !(await checkRateLimit(`approval:${identity}`, ratePolicies.publicApproval)).allowed
  )
    throw new AppError("RATE_LIMITED", "Too many approval attempts.");
  const result = await respondToEstimateApproval(
    token,
    response,
    signerName,
    signatureData,
  );
  return result;
}
