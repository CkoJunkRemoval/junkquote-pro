import type { EstimateStatus, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
export {ESTIMATE_STATUSES,estimateTransitions,isEstimateEditable,canDeleteEstimate,canTransitionEstimateStatus,ESTIMATE_READ_ONLY_MESSAGE,ESTIMATE_DELETE_MESSAGE,estimateStatusBadges} from "./lifecyclePolicy";
import {canTransitionEstimateStatus,estimateStatusBadges} from "./lifecyclePolicy";
import {queryEstimateEvents,recordEstimateEventInTransaction} from "./estimateEvents";

export type EstimateWorkflowStatus = EstimateStatus;

const details: Partial<Record<EstimateStatus, { eventType: import("./estimateEvents").EstimateEventType; activity: string; category: import("@/generated/prisma/client").EstimateEventCategory; visibility?:import("@/generated/prisma/client").EstimateEventVisibility; notification?: string }>> = {
  Sent:{eventType:"Estimate Sent",activity:"sent estimate",category:"Communication",visibility:"Both",notification:"Estimate Sent"}, Viewed:{eventType:"Customer Viewed",activity:"Customer viewed estimate",category:"Lifecycle",visibility:"Both",notification:"Estimate Viewed"},
  Approved:{eventType:"Customer Approved",activity:"Customer approved estimate",category:"Lifecycle",visibility:"Both",notification:"Estimate Approved"}, Declined:{eventType:"Customer Declined",activity:"Customer declined estimate",category:"Lifecycle",visibility:"Both",notification:"Estimate Declined"},
  Expired:{eventType:"Estimate Expired",activity:"estimate expired",category:"Lifecycle",visibility:"Both",notification:"Estimate Expired"}, Scheduled:{eventType:"Estimate Scheduled",activity:"scheduled estimate",category:"Scheduling",visibility:"Both",notification:"Estimate Scheduled"},
  InProgress:{eventType:"Job Started",activity:"started job",category:"Job",visibility:"Both"}, Completed:{eventType:"Job Completed",activity:"completed job",category:"Job",visibility:"Both",notification:"Estimate Completed"},
  Invoiced:{eventType:"Invoice Generated",activity:"generated invoice",category:"Invoice",visibility:"Both",notification:"Invoice Generated"}, Paid:{eventType:"Payment Recorded",activity:"recorded payment",category:"Payment",visibility:"Both",notification:"Payment Received"},
  Canceled:{eventType:"Estimate Archived",activity:"archived estimate",category:"Lifecycle"},
};

export interface LifecycleActor { label: string; type?:"System"|"Employee"|"Customer"|"PlatformAdmin"; id?:string; userId?: string; portalAccessId?: string }
export interface TransitionOptions { actor?: LifecycleActor; metadata?: Record<string, unknown>; data?: Prisma.EstimateUpdateInput }
type Tx = Prisma.TransactionClient;

export async function transitionEstimateInTransaction(tx: Tx, companyId: string, estimateId: string, nextStatus: EstimateStatus, options: TransitionOptions = {}) {
  const estimate = await tx.estimate.findFirst({where:{id:estimateId,companyId},select:{id:true,status:true}});
  if (!estimate) throw new Error("Estimate not found.");
  if (!canTransitionEstimateStatus(estimate.status, nextStatus)) throw new Error(`Estimate cannot move from ${estimateStatusBadges[estimate.status].label} to ${estimateStatusBadges[nextStatus].label}.`);
  const actor = options.actor ?? {label:"System"}; const detail = details[nextStatus]!; const metadata = {from:estimate.status,to:nextStatus,...options.metadata};
  const updated = await tx.estimate.update({where:{id:estimateId},data:{...options.data,status:nextStatus}});
  await recordEstimateEventInTransaction(tx, {companyId,estimateId,eventType:detail.eventType,category:detail.category,actor:{type:actor.type??(actor.portalAccessId?"Customer":actor.userId?"Employee":"System"),id:actor.id??actor.userId??actor.portalAccessId,displayName:actor.label,userId:actor.userId,portalAccessId:actor.portalAccessId},summary:detail.activity.startsWith("Customer")?detail.activity:`${actor.label} ${detail.activity}`,visibility:detail.visibility,jobId:typeof options.metadata?.jobId==="string"?options.metadata.jobId:undefined,metadata,auditEventType:`estimate.${nextStatus.toLowerCase()}`,notification:detail.notification?{userId:actor.userId,title:detail.notification,body:`Estimate status changed to ${estimateStatusBadges[nextStatus].label}.`}:undefined});
  return updated;
}

export function transitionEstimate(companyId:string,estimateId:string,nextStatus:EstimateStatus,options?:TransitionOptions) {
  return prisma.$transaction(tx=>transitionEstimateInTransaction(tx,companyId,estimateId,nextStatus,options));
}

export async function listEstimateActivity(companyId:string,estimateId:string) { return (await queryEstimateEvents(companyId,{audience:"employee",estimateId,limit:100})).events.map(e=>({...e,message:e.summary,createdAt:e.timestamp})); }
