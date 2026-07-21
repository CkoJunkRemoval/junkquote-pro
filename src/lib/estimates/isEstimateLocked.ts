export interface EstimateApprovalState {
  status: string;
  signedAt?: Date | string | null;
}

/** The single lifecycle rule for destructive and editing operations. */
export function isEstimateLocked(estimate: EstimateApprovalState) {
  return estimate.status === "Approved" || estimate.signedAt != null;
}

export const ESTIMATE_LOCKED_MESSAGE =
  "This estimate has been approved and is read-only. Approved estimates cannot be deleted.";
