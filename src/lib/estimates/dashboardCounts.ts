import { prisma } from "@/lib/prisma";
export async function getEstimateLifecycleDashboardCounts(companyId:string,now=new Date()) {
  const monthStart=new Date(now.getFullYear(),now.getMonth(),1); const dayStart=new Date(now); dayStart.setHours(0,0,0,0); const dayEnd=new Date(dayStart); dayEnd.setDate(dayEnd.getDate()+1);
  const [groups,completedToday,paidThisMonth]=await Promise.all([prisma.estimate.groupBy({by:["status"],where:{companyId},_count:{_all:true}}),prisma.estimateTimelineEvent.count({where:{companyId,eventType:"Job Completed",timestamp:{gte:dayStart,lt:dayEnd}}}),prisma.estimateTimelineEvent.count({where:{companyId,eventType:{in:["Payment Recorded","Invoice Paid"]},timestamp:{gte:monthStart,lt:now}}})]); const count=Object.fromEntries(groups.map(x=>[x.status,x._count._all]));
  return {draftEstimates:count.Draft??0,awaitingApproval:(count.Sent??0)+(count.Viewed??0),approved:count.Approved??0,scheduled:count.Scheduled??0,inProgress:count.InProgress??0,completedToday,invoicesAwaitingPayment:count.Invoiced??0,paidThisMonth};
}
