"use server";

import {
  respondToEstimateApproval,
  type PublicEstimateResponse,
} from "@/lib/estimates/respondToEstimateApproval";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { AppError } from "@/lib/errors/appError";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";

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
  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    select: { id: true, companyId: true },
  });
  const result = await respondToEstimateApproval(
    token,
    response,
    signerName,
    signatureData,
  );
  if (estimate)
    await recordAuditEvent({
      companyId: estimate.companyId,
      eventType:
        response === "approve" ? "estimate.approved" : "estimate.declined",
      entityType: "Estimate",
      entityId: estimate.id,
      requestId: await currentRequestId(),
      metadata: {
        signatureMethod: response === "approve" ? "PublicLink" : undefined,
      },
    });
  return result;
}
