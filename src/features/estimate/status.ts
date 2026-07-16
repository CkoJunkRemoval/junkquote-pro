export enum EstimateStatus {
  Draft = "Draft",

  Ready = "Ready",

  Sent = "Sent",

  Approved = "Approved",

  Scheduled = "Scheduled",

  Completed = "Completed",

  Declined = "Declined",

  Archived = "Archived",
}

export interface TimelineEvent {
  id: string;

  timestamp: string;

  title: string;

  description: string;
}
