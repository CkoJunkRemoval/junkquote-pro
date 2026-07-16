export type EstimateWorkflowStatus =
  | "Draft"
  | "Ready"
  | "Sent"
  | "Approved"
  | "Declined"
  | "Scheduled"
  | "Completed"
  | "Archived";

export const statusTransitions: Record<EstimateWorkflowStatus, EstimateWorkflowStatus[]> = {
  Draft: ["Ready"],
  Ready: ["Sent"],
  Sent: ["Approved", "Declined"],
  Approved: ["Scheduled"],
  Declined: [],
  Scheduled: ["Completed"],
  Completed: ["Archived"],
  Archived: [],
};

export function canTransitionEstimateStatus(
  currentStatus: EstimateWorkflowStatus,
  nextStatus: EstimateWorkflowStatus
) {
  return statusTransitions[currentStatus].includes(nextStatus);
}
