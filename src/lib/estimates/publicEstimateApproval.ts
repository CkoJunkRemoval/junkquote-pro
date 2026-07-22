import type { EstimateStatus } from "@/generated/prisma/client";
export type PublicApprovalStatus = EstimateStatus;
export function getPublicApprovalError(status:PublicApprovalStatus|null,expiresAt:Date|null,now=new Date()) {
  if (!status || !expiresAt || expiresAt <= now) return "This approval link is invalid or has expired.";
  if (["Declined","Expired","Canceled","Paid"].includes(status)) return "This estimate is no longer available for approval.";
  return null;
}
