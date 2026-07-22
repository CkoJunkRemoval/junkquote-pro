import { prisma } from "../prisma";
import { canTransitionJobStatus, type JobWorkflowStatus } from "./statusWorkflow";
import { recordCompletedJobPricing } from "@/lib/smartPricing/history";
import { syncPricingOutcomeForJob } from "@/lib/smartPricing/outcomes";
import { createInvoiceFromJob } from "@/lib/invoices/createInvoice";
import type { DispatchProgress } from "@/generated/prisma/client";
import { transitionEstimateInTransaction } from "@/lib/estimates/estimateLifecycle";

export interface UpdateJobInput {
  id: string;
  status?: JobWorkflowStatus;
  scheduledStart?: Date | null;
  scheduledEnd?: Date | null;
  crewNotes?: string;
  customerNotes?: string;
  truck?: string | null;
  completionNotes?: string;
  actualLaborHours?: number | null;
  actualLaborCost?: number | null;
  actualDisposalCost?: number | null;
  actualTravelCost?: number | null;
  otherActualCost?: number | null;
  actualCostNotes?: string;
  finalInvoiceAmount?: number | null;
  dispatchProgress?: DispatchProgress;
}

export async function updateJob(companyId: string, input: UpdateJobInput) {
  for (const [label, value] of [["Actual labor hours", input.actualLaborHours], ["Actual labor cost", input.actualLaborCost], ["Actual disposal cost", input.actualDisposalCost], ["Actual travel cost", input.actualTravelCost], ["Other actual cost", input.otherActualCost], ["Final invoice amount", input.finalInvoiceAmount]] as const) if (value !== undefined && value !== null && (!Number.isFinite(value) || value < 0)) throw new Error(`${label} cannot be negative.`);
  const updated = await prisma.$transaction(async (tx) => {
    const job = await tx.job.findFirst({
      where: { id: input.id, companyId },
      select: { id: true, status: true, dispatchProgress: true, scheduledStart: true, estimateId: true, estimate: { select: { status: true } } },
    });

    if (!job) throw new Error("Job not found.");
    const currentStatus = job.status as JobWorkflowStatus;
    const scheduledStart = input.scheduledStart === undefined ? job.scheduledStart : input.scheduledStart;
    const nextStatus = input.status ?? (input.dispatchProgress && currentStatus === "Scheduled" ? "InProgress" : scheduledStart && currentStatus === "Unscheduled" ? "Scheduled" : currentStatus);

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
        ...(nextStatus === "Completed" && currentStatus !== "Completed" ? { completedAt: new Date() } : {}),
        ...(input.scheduledStart !== undefined ? { scheduledStart: input.scheduledStart } : {}),
        ...(input.scheduledEnd !== undefined ? { scheduledEnd: input.scheduledEnd } : {}),
        ...(input.crewNotes !== undefined ? { crewNotes: input.crewNotes.trim() } : {}),
        ...(input.customerNotes !== undefined ? { customerNotes: input.customerNotes.trim() } : {}),
        ...(input.truck !== undefined ? { truck: input.truck?.trim() || null } : {}),
        ...(input.completionNotes !== undefined ? { completionNotes: input.completionNotes.trim() } : {}),
        ...(input.actualLaborHours !== undefined ? { actualLaborHours: input.actualLaborHours } : {}),
        ...(input.actualLaborCost !== undefined ? { actualLaborCost: input.actualLaborCost } : {}),
        ...(input.actualDisposalCost !== undefined ? { actualDisposalCost: input.actualDisposalCost } : {}),
        ...(input.actualTravelCost !== undefined ? { actualTravelCost: input.actualTravelCost } : {}),
        ...(input.otherActualCost !== undefined ? { otherActualCost: input.otherActualCost } : {}),
        ...(input.actualCostNotes !== undefined ? { actualCostNotes: input.actualCostNotes.trim() } : {}),
        ...(input.finalInvoiceAmount !== undefined ? { finalInvoiceAmount: input.finalInvoiceAmount } : {}),
        ...(input.dispatchProgress !== undefined ? { dispatchProgress: input.dispatchProgress, ...(input.dispatchProgress === "EnRoute" ? { enRouteAt: new Date() } : input.dispatchProgress === "Arrived" ? { arrivedAt: new Date() } : {}) } : {}),
      },
    });

    if (nextStatus === "Completed" && job.estimate.status === "InProgress") {
      await transitionEstimateInTransaction(tx,companyId,job.estimateId,"Completed",{actor:{label:"Crew"},metadata:{jobId:job.id}});
    } else if (nextStatus === "InProgress" && job.estimate.status === "Scheduled") {
      await transitionEstimateInTransaction(tx,companyId,job.estimateId,"InProgress",{actor:{label:"Crew"},metadata:{jobId:job.id}});
    } else if (scheduledStart && job.estimate.status === "Approved") {
      await transitionEstimateInTransaction(tx,companyId,job.estimateId,"Scheduled",{actor:{label:"Team member"},metadata:{jobId:job.id}});
    }

    return updated;
  });
  if (updated.status === "Completed") { const recurring = await prisma.job.findFirst({ where: { id: updated.id, companyId, servicePlan: { companyId, autoCreateInvoices: true } }, select: { invoice: { select: { id: true } } } }); if (recurring && !recurring.invoice) await createInvoiceFromJob(companyId, updated.id); await recordCompletedJobPricing(companyId, updated.id); await syncPricingOutcomeForJob(companyId, updated.id); }
  return updated;
}
