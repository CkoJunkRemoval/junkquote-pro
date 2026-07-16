import { prisma } from "../prisma";
import { getPublicApprovalError, type PublicApprovalStatus } from "./publicEstimateApproval";

export type PublicEstimateResponse = "approve" | "decline";

export async function respondToEstimateApproval(token: string, response: PublicEstimateResponse) {
  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    select: { status: true, approvalTokenExpiresAt: true },
  });
  const error = getPublicApprovalError(
    estimate?.status as PublicApprovalStatus | undefined ?? null,
    estimate?.approvalTokenExpiresAt ?? null
  );

  if (error) {
    throw new Error(error);
  }

  const nextStatus = response === "approve" ? "Approved" : "Declined";
  const result = await prisma.estimate.updateMany({
    where: { approvalToken: token, status: "Sent" },
    data: { status: nextStatus },
  });

  if (result.count !== 1) {
    throw new Error("This estimate has already received a response.");
  }

  return { status: nextStatus };
}
