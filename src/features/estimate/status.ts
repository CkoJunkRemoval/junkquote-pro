export enum EstimateStatus {
  Draft = "Draft",

  Viewed = "Viewed",

  Sent = "Sent",

  Approved = "Approved",

  Scheduled = "Scheduled",
  InProgress = "InProgress",

  Completed = "Completed",

  Declined = "Declined",

  Invoiced = "Invoiced",
  Paid = "Paid",
  Expired = "Expired",
  Canceled = "Canceled",
}

export interface TimelineEvent {
  id: string;

  timestamp: string;

  title: string;

  description: string;
}
