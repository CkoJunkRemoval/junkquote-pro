export type JobWorkflowStatus = "Unscheduled" | "Scheduled" | "InProgress" | "Completed" | "Cancelled";

export const jobStatusTransitions: Record<JobWorkflowStatus, JobWorkflowStatus[]> = {
  Unscheduled: ["Scheduled", "Cancelled"],
  Scheduled: ["InProgress", "Cancelled"],
  InProgress: ["Completed", "Cancelled"],
  Completed: [],
  Cancelled: [],
};

export function canTransitionJobStatus(current: JobWorkflowStatus, next: JobWorkflowStatus) {
  return current === next || jobStatusTransitions[current].includes(next);
}
