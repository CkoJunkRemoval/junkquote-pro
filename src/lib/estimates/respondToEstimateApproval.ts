import { prisma } from "../prisma";
import { getPublicApprovalError, type PublicApprovalStatus } from "./publicEstimateApproval";
import { validateSignature } from "./signatureValidation";
import { requireSubscriptionAccess } from "@/lib/billing/entitlements";

export type PublicEstimateResponse = "approve" | "decline";

export async function respondToEstimateApproval(token: string, response: PublicEstimateResponse, signerName?: string, signatureData?: string) {
  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    select: { companyId: true, status: true, approvalTokenExpiresAt: true },
  });
  const error = getPublicApprovalError(
    estimate?.status as PublicApprovalStatus | undefined ?? null,
    estimate?.approvalTokenExpiresAt ?? null
  );

  if (error) {
    throw new Error(error);
  }
  await requireSubscriptionAccess(estimate!.companyId);

  const nextStatus = response === "approve" ? "Approved" : "Declined";
  if (response === "approve") validateSignature(signerName ?? "", signatureData ?? "");
  const result = await prisma.estimate.updateMany({
    where: { approvalToken: token, status: "Sent", ...(response === "approve" ? { signatureData: null } : {}) },
    data: response === "approve"
      ? { status: nextStatus, signerName: signerName!.trim(), signatureData: signatureData!, signedAt: new Date(), signatureMethod: "PublicLink" }
      : { status: nextStatus },
  });

  if (result.count !== 1) {
    throw new Error("This estimate has already received a response.");
  }

  return { status: nextStatus };
}
