import type { EstimateEventActorType, EstimateEventCategory, EstimateEventVisibility, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const ESTIMATE_EVENT_TYPES = [
  "Estimate Created", "Estimate Updated", "Customer Updated", "Property Updated", "Items Changed", "Pricing Changed",
  "Photos Added", "Photos Removed", "Notes Updated", "Estimate Sent", "Reminder Sent", "Customer Viewed",
  "Customer Approved", "Customer Declined", "Estimate Expired", "Estimate Scheduled", "Crew Assigned", "Job Started",
  "Job Completed", "Invoice Generated", "Invoice Sent", "Payment Recorded", "Revision Created", "Revision Approved",
  "Estimate Archived",
  "Reschedule Requested", "Customer Message Sent",
  "Crew En Route", "Crew Arrived", "Work Started", "Loading Started", "Cleanup Started", "Ready for Invoice",
  "Checklist Updated", "Change Order Requested", "Change Order Approved", "Change Order Declined",
  "Completion Signed", "Time Tracking Updated", "Disposal Recorded", "Field Notes Updated",
] as const;
export type EstimateEventType = (typeof ESTIMATE_EVENT_TYPES)[number];

export interface EstimateEventActor {
  type: EstimateEventActorType;
  id?: string;
  displayName: string;
  userId?: string;
  portalAccessId?: string;
}
export interface EstimateEventAttachmentInput { referenceType: "Photo"|"Document"|"Invoice"|"ApprovalPdf"; referenceId: string; displayName: string; url?: string; metadata?: Record<string, unknown> }
export interface RecordEstimateEventInput {
  companyId: string;
  estimateId: string;
  eventType: EstimateEventType;
  category: EstimateEventCategory;
  actor: EstimateEventActor;
  title?: string;
  summary: string;
  visibility?: EstimateEventVisibility;
  jobId?: string;
  metadata?: Record<string, unknown>;
  attachments?: EstimateEventAttachmentInput[];
  notification?: { userId?: string; title: string; body: string };
  auditEventType?: string;
}

export async function recordEstimateEventInTransaction(tx: Prisma.TransactionClient, input: RecordEstimateEventInput) {
  const estimate = await tx.estimate.findFirst({ where: { id: input.estimateId, companyId: input.companyId }, select: { id: true, displayNumber: true, customer: { select: { firstName: true, lastName: true } } } });
  if (!estimate) throw new Error("Estimate not found for event.");
  const metadata = input.metadata as Prisma.InputJsonValue | undefined;
  const searchText = [input.eventType,input.title,input.summary,input.actor.displayName,estimate.displayNumber,estimate.customer?.firstName,estimate.customer?.lastName].filter(Boolean).join(" ").toLowerCase();
  const event = await tx.estimateTimelineEvent.create({ data: {
    companyId: input.companyId, estimateId: input.estimateId, eventType: input.eventType, category: input.category,
    actor: input.actor.displayName, actorType: input.actor.type, actorId: input.actor.id, actorDisplayName: input.actor.displayName,
    title: input.title ?? input.eventType, summary: input.summary, visibility: input.visibility ?? "Internal", searchText,
    jobId: input.jobId, metadata,
    attachments: input.attachments?.length ? { create: input.attachments.map(a=>({referenceType:a.referenceType,referenceId:a.referenceId,displayName:a.displayName,url:a.url,metadata:a.metadata as Prisma.InputJsonValue|undefined})) } : undefined,
  }, include: { attachments: true } });
  await tx.estimateActivityFeedItem.create({ data: { companyId:input.companyId,estimateId:input.estimateId,eventType:input.eventType,actor:input.actor.displayName,message:input.summary,metadata } });
  await tx.auditEvent.create({ data: { companyId:input.companyId,actingUserId:input.actor.userId,portalAccessId:input.actor.portalAccessId,eventType:input.auditEventType??`estimate.${input.eventType.toLowerCase().replaceAll(" ","_")}`,entityType:"Estimate",entityId:input.estimateId,metadata:{eventId:event?.id,...input.metadata} } });
  if(input.notification) await tx.systemNotification.create({data:{companyId:input.companyId,userId:input.notification.userId,channel:"in-app",title:input.notification.title,body:input.notification.body}});
  return event;
}

export function recordEstimateEvent(input: RecordEstimateEventInput) { return prisma.$transaction(tx=>recordEstimateEventInTransaction(tx,input)); }

export type EstimateEventAudience = "employee"|"customer"|"platformAdmin";
export interface EstimateEventFilters {
  audience: EstimateEventAudience;
  actorId?: string; category?: EstimateEventCategory; from?: Date; to?: Date; customerId?: string; estimateId?: string; jobId?: string; search?: string; cursor?: string; limit?: number;
}
export async function queryEstimateEvents(companyId:string, filters:EstimateEventFilters) {
  const limit=Math.min(100,Math.max(1,filters.limit??25));
  const visibility = filters.audience==="platformAdmin" ? undefined : filters.audience==="customer" ? {in:["Customer","Both"] as EstimateEventVisibility[]} : {in:["Internal","Both"] as EstimateEventVisibility[]};
  const search=filters.search?.trim().toLowerCase();
  const rows=await prisma.estimateTimelineEvent.findMany({where:{companyId,...(visibility?{visibility}:{}),...(filters.actorId?{actorId:filters.actorId}:{}),...(filters.category?{category:filters.category}:{}),...(filters.estimateId?{estimateId:filters.estimateId}:{}),...(filters.jobId?{jobId:filters.jobId}:{}),...(filters.customerId?{estimate:{customerId:filters.customerId}}:{}),...(filters.from||filters.to?{timestamp:{...(filters.from?{gte:filters.from}:{}),...(filters.to?{lt:filters.to}:{})}}:{}),...(search?{OR:[{searchText:{contains:search}},{estimate:{displayNumber:{contains:search,mode:"insensitive"}}},{estimate:{customer:{OR:[{firstName:{contains:search,mode:"insensitive"}},{lastName:{contains:search,mode:"insensitive"}}]}}}]}:{})},orderBy:[{timestamp:"desc"},{id:"desc"}],take:limit+1,...(filters.cursor?{cursor:{id:filters.cursor},skip:1}:{}),include:{attachments:true,estimate:{select:{id:true,displayNumber:true,customerId:true,customer:{select:{firstName:true,lastName:true}},job:{select:{id:true,jobNumber:true}}}}}});
  const hasMore=rows.length>limit; const events=hasMore?rows.slice(0,limit):rows;
  return {events,nextCursor:hasMore?events.at(-1)!.id:null};
}

export function activityDateRange(value:"today"|"yesterday"|"last7"|"month"|"all",now=new Date()) {
  if(value==="all")return{}; const start=new Date(now); start.setHours(0,0,0,0); let to:Date|undefined;
  if(value==="yesterday"){to=new Date(start);start.setDate(start.getDate()-1)} else if(value==="last7")start.setDate(start.getDate()-6); else if(value==="month")start.setDate(1);
  return {from:start,to};
}

export async function getEstimateActivityDashboard(companyId:string,audience:EstimateEventAudience="employee",now=new Date()) {
  const today=activityDateRange("today",now); const recent=await queryEstimateEvents(companyId,{audience,limit:10});
  const [customer,todaysChanges,pendingApprovals]=await Promise.all([
    queryEstimateEvents(companyId,{audience:"customer",limit:10}),
    prisma.estimateTimelineEvent.count({where:{companyId,timestamp:{gte:today.from},visibility:audience==="platformAdmin"?undefined:{in:["Internal","Both"]}}}),
    prisma.estimate.count({where:{companyId,status:{in:["Sent","Viewed"]}}}),
  ]);
  return {recentCompanyActivity:recent.events,recentCustomerActivity:customer.events,pendingApprovals,todaysChanges};
}
