import { updateJob } from "./updateJob";

export interface ScheduleJobInput {
  id: string;
  scheduledStart: string;
  scheduledEnd: string;
}

export async function scheduleJob(companyId: string, input: ScheduleJobInput) {
  const scheduledStart = new Date(input.scheduledStart);
  const scheduledEnd = new Date(input.scheduledEnd);
  if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
    throw new Error("A valid start and end date are required.");
  }
  return updateJob(companyId, { id: input.id, scheduledStart, scheduledEnd });
}
