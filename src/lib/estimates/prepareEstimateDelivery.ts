import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";

import { prisma } from "../prisma";
import { generateApprovalToken } from "./approvalToken";

export type EstimateDeliveryMethod = "email" | "sms" | "link" | "device";

export async function prepareEstimateDelivery(
  estimateId: string,
  method: EstimateDeliveryMethod
) {
  const estimate = await prisma.estimate.findFirst({
    where: {
      id: estimateId,
      companyId: DEVELOPMENT_COMPANY_ID,
      status: "Ready",
    },
    select: { id: true },
  });

  if (!estimate) {
    throw new Error("Only Ready estimates may be prepared for delivery.");
  }

  const approvalToken = generateApprovalToken();
  const now = new Date();
  const approvalTokenExpiresAt = new Date(now);
  approvalTokenExpiresAt.setDate(approvalTokenExpiresAt.getDate() + 7);

  await prisma.estimate.update({
    where: { id: estimate.id },
    data: {
      approvalToken,
      approvalTokenExpiresAt,
      sentAt: now,
      ...(method === "email" ? { sentByEmailAt: now } : {}),
      ...(method === "sms" ? { sentBySmsAt: now } : {}),
    },
  });

  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")
    .replace(/\/$/, "");

  return {
    approvalUrl: `${baseUrl}/approve/${approvalToken}`,
    approvalTokenExpiresAt,
  };
}
