import type { EstimateStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
export {ESTIMATE_STATUSES,estimateTransitions,isEstimateEditable,canDeleteEstimate,canTransitionEstimateStatus,ESTIMATE_READ_ONLY_MESSAGE,ESTIMATE_DELETE_MESSAGE,estimateStatusBadges} from "./lifecyclePolicy";
import {canTransitionEstimateStatus,estimateStatusBadges} from "./lifecyclePolicy";

export type EstimateWorkflowStatus = EstimateStatus;

const details: Partial<Record<EstimateStatus, { eventType: string; activity: string; notification?: string }>> = {
  Sent:{eventType:"Estimate Sent",activity:"sent estimate",notification:"Estimate Sent"}, Viewed:{eventType:"Customer Viewed",activity:"Customer viewed estimate",notification:"Estimate Viewed"},
  Approved:{eventType:"Customer Approved",activity:"Customer approved estimate",notification:"Estimate Approved"}, Declined:{eventType:"Customer Declined",activity:"Customer declined estimate",notification:"Estimate Declined"},
  Expired:{eventType:"Estimate Expired",activity:"estimate expired",notification:"Estimate Expired"}, Scheduled:{eventType:"Estimate Scheduled",activity:"scheduled estimate",notification:"Estimate Scheduled"},
  InProgress:{eventType:"Job Started",activity:"started job"}, Completed:{eventType:"Job Completed",activity:"completed job",notification:"Estimate Completed"},
  Invoiced:{eventType:"Invoice Generated",activity:"generated invoice",notification:"Invoice Generated"}, Paid:{eventType:"Invoice Paid",activity:"recorded payment",notification:"Payment Received"},
  Canceled:{eventType:"Estimate Canceled",activity:"canceled estimate"},
};

export interface LifecycleActor { label: string; userId?: string; portalAccessId?: string }
export interface TransitionOptions { actor?: LifecycleActor; metadata?: Record<string, unknown>; data?: Prisma.EstimateUpdateInput }
type Tx = Prisma.TransactionClient;

export async function transitionEstimateInTransaction(tx: Tx, companyId: string, estimateId: string, nextStatus: EstimateStatus, options: TransitionOptions = {}) {
  const estimate = await tx.estimate.findFirst({where:{id:estimateId,companyId},select:{id:true,status:true}});
  if (!estimate) throw new Error("Estimate not found.");
  if (!canTransitionEstimateStatus(estimate.status, nextStatus)) throw new Error(`Estimate cannot move from ${estimateStatusBadges[estimate.status].label} to ${estimateStatusBadges[nextStatus].label}.`);
  const actor = options.actor ?? {label:"System"}; const detail = details[nextStatus]!; const metadata = {from:estimate.status,to:nextStatus,...options.metadata} as Prisma.InputJsonValue;
  const updated = await tx.estimate.update({where:{id:estimateId},data:{...options.data,status:nextStatus}});
  await tx.estimateTimelineEvent.create({data:{eventType:detail.eventType,estimateId,companyId,actor:actor.label,metadata}});
  await tx.estimateActivityFeedItem.create({data:{eventType:detail.eventType,estimateId,companyId,actor:actor.label,message:detail.activity.startsWith("Customer")?detail.activity:`${actor.label} ${detail.activity}`,metadata}});
  await tx.auditEvent.create({data:{companyId,actingUserId:actor.userId,portalAccessId:actor.portalAccessId,eventType:`estimate.${nextStatus.toLowerCase()}`,entityType:"Estimate",entityId:estimateId,metadata}});
  if (detail.notification) await tx.systemNotification.create({data:{companyId,userId:actor.userId,channel:"in-app",title:detail.notification,body:`Estimate status changed to ${estimateStatusBadges[nextStatus].label}.`}});
  return updated;
}

export function transitionEstimate(companyId:string,estimateId:string,nextStatus:EstimateStatus,options?:TransitionOptions) {
  return prisma.$transaction(tx=>transitionEstimateInTransaction(tx,companyId,estimateId,nextStatus,options));
}

export async function recordEstimateEvent(companyId:string,estimateId:string,eventType:string,actor:LifecycleActor,message:string,metadata?:Record<string,unknown>) {
  return prisma.$transaction(async tx=>{ const json=metadata as Prisma.InputJsonValue|undefined; await tx.estimateTimelineEvent.create({data:{companyId,estimateId,eventType,actor:actor.label,metadata:json}}); await tx.estimateActivityFeedItem.create({data:{companyId,estimateId,eventType,actor:actor.label,message,metadata:json}}); await tx.auditEvent.create({data:{companyId,actingUserId:actor.userId,portalAccessId:actor.portalAccessId,eventType:eventType.toLowerCase().replaceAll(" ","."),entityType:"Estimate",entityId:estimateId,metadata:json}}); });
}

export async function listEstimateActivity(companyId:string,estimateId:string) { return prisma.estimateActivityFeedItem.findMany({where:{companyId,estimateId},orderBy:{createdAt:"desc"}}); }
