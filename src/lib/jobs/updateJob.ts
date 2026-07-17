import { prisma } from "../prisma";
import { canTransitionJobStatus, type JobWorkflowStatus } from "./statusWorkflow";

export interface UpdateJobInput {
  id: string;
  status?: JobWorkflowStatus;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  crewNotes?: string;
  customerNotes?: string;
  completionNotes?: string;
}

export async function updateJob(companyId: string, input: UpdateJobInput) {
  return prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { id: input.id, companyId },
      select: { id: true, status: true, scheduledStart: true, estimateId: true, estimate: { select: { status: true } } },
    });

    if (!job) throw new Error("Job not found.");
    const currentStatus = job.status as JobWorkflowStatus;
    const scheduledStart = input.scheduledStart === undefined ? job.scheduledStart : input.scheduledStart;
    const nextStatus = input.status ?? (scheduledStart && currentStatus === "Unscheduled" ? "Scheduled" : currentStatus);

    if (!canTransitionJobStatus(currentStatus, nextStatus)) {
      throw new Error(`Invalid job status transition: ${currentStatus} to ${nextStatus}.`);
    }
    if (nextStatus === "Scheduled" && !scheduledStart) {
      throw new Error("A scheduled job requires a scheduled start.");
    }
    if (input.scheduledEnd && scheduledStart && input.scheduledEnd < scheduledStart) {
      throw new Error("Scheduled end must be after scheduled start.");
    }

    const updated = await tx.job.update({
      where: { id: job.id },
      data: {
        status: nextStatus,
        ...(input.scheduledStart !== undefined ? { scheduledStart: input.scheduledStart } : {}),
        ...(input.scheduledEnd !== undefined ? { scheduledEnd: input.scheduledEnd } : {}),
        ...(input.crewNotes !== undefined ? { crewNotes: input.crewNotes.trim() } : {}),
        ...(input.customerNotes !== undefined ? { customerNotes: input.customerNotes.trim() } : {}),
        ...(input.completionNotes !== undefined ? { completionNotes: input.completionNotes.trim() } : {}),
      },
    });

    if (scheduledStart && job.estimate.status === "Approved") {
      await tx.estimate.update({ where: { id: job.estimateId }, data: { status: "Scheduled" } });
    }

    return updated;
  });
}
