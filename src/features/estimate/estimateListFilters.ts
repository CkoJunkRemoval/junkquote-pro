import type { EstimateStatus } from "@/generated/prisma/client";

export type EstimateManagementStatus =
  | "All"
  | "AwaitingApproval"
  | EstimateStatus;

export const estimateManagementStatuses: readonly EstimateManagementStatus[] = [
  "All",
  "Draft",
  "AwaitingApproval",
  "Sent",
  "Viewed",
  "Approved",
  "Scheduled",
  "InProgress",
  "Completed",
  "Invoiced",
  "Paid",
  "Declined",
  "Expired",
  "Canceled",
];

export function parseEstimateManagementStatus(
  raw: string | null | undefined,
): EstimateManagementStatus {
  return estimateManagementStatuses.includes(raw as EstimateManagementStatus)
    ? (raw as EstimateManagementStatus)
    : "All";
}

export function estimateManagementStatusLabel(
  status: EstimateManagementStatus,
) {
  if (status === "AwaitingApproval") return "Awaiting Approval";
  if (status === "InProgress") return "In Progress";
  return status;
}
