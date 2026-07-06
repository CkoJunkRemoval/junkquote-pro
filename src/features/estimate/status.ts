export enum EstimateStatus {
  Draft = "Draft",

  Ready = "Ready",

  Sent = "Sent",

  Viewed = "Viewed",

  PendingSignature = "Pending Signature",

  Approved = "Approved",

  Scheduled = "Scheduled",

  InProgress = "In Progress",

  Completed = "Completed",

  Invoiced = "Invoiced",

  Paid = "Paid",

  Declined = "Declined",

  Archived = "Archived",
}

export interface TimelineEvent {
  id: string;

  timestamp: string;

  title: string;

  description: string;
}