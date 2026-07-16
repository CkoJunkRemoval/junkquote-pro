export type PublicApprovalStatus =
  | "Draft"
  | "Ready"
  | "Sent"
  | "Approved"
  | "Declined"
  | "Scheduled"
  | "Completed"
  | "Archived";

export function getPublicApprovalError(
  status: PublicApprovalStatus | null,
  expiresAt: Date | null,
  now = new Date()
) {
  if (!status || !expiresAt || expiresAt <= now) {
    return "This approval link is invalid or has expired.";
  }

  if (status === "Archived" || status === "Declined") {
    return "This estimate is no longer available for approval.";
  }

  return null;
}
