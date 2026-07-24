import { randomUUID } from "node:crypto";
import { prisma } from "../prisma";
import { transitionEstimateInTransaction } from "@/lib/estimates/estimateLifecycle";
import {recordEstimateEventInTransaction} from "@/lib/estimates/estimateEvents";
import { emitCommunicationEventForSource } from "@/lib/communications/engine";

export interface ScheduleApprovedEstimateInput {
  estimateId: string;
  scheduledStart: string;
  scheduledEnd: string;
  crewId?: string;
  truck?: string;
  notes?: string;
}

export async function scheduleApprovedEstimate(companyId: string, input: ScheduleApprovedEstimateInput) {
  const start = new Date(input.scheduledStart);
  const end = new Date(input.scheduledEnd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) throw new Error("A valid job start and end time are required.");
  const job=await prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findFirst({ where: { id: input.estimateId, companyId }, select: { id: true, status: true, companyId: true, customerId: true, propertyId: true } });
    if (!estimate) throw new Error("Estimate not found.");
    if (estimate.status !== "Approved") throw new Error("Only an approved estimate can be scheduled.");
    if (await tx.job.findUnique({ where: { estimateId: estimate.id }, select: { id: true } })) throw new Error("A job already exists for this estimate.");
    if (input.crewId && !await tx.crew.findFirst({ where: { id: input.crewId, companyId, active: true }, select: { id: true } })) throw new Error("Crew not found.");
    const job = await tx.job.create({ data: {
      companyId, estimateId: estimate.id, customerId: estimate.customerId, propertyId: estimate.propertyId,
      jobNumber: `JOB-${randomUUID().slice(0, 8).toUpperCase()}`,
      status: "Scheduled", scheduledStart: start, scheduledEnd: end,
      truck: input.truck?.trim() || null, crewNotes: input.notes?.trim() || "",
      ...(input.crewId ? { assignments: { create: { companyId, crewId: input.crewId } } } : {}),
    } });
    await transitionEstimateInTransaction(tx,companyId,estimate.id,"Scheduled",{actor:{label:"Team member"},metadata:{jobId:job.id}});
    if(input.crewId)await recordEstimateEventInTransaction(tx,{companyId,estimateId:estimate.id,eventType:"Crew Assigned",category:"Scheduling",actor:{type:"Employee",displayName:"Team member"},summary:"Team member assigned a crew",visibility:"Internal",jobId:job.id,metadata:{jobId:job.id,crewId:input.crewId}});
    return job;
  });
  await emitCommunicationEventForSource({companyId,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:job.id,dedupeKey:`JOB_SCHEDULED:${job.id}`});
  return job;
}
