import { prisma } from "@/lib/prisma";
import type { CommunicationDeliveryStatus, Prisma } from "@/generated/prisma/client";

export type CommunicationCenterFilters = {
  view?: "activity"|"scheduled"|"failed"|"templates"|"automation"|"preferences"|"notifications";
  eventType?: string;
  channel?: string;
  status?: string;
  customerId?: string;
  sourceId?: string;
  page?: number;
};

export async function getCommunicationCenter(companyId:string,userId:string,role:string,filters:CommunicationCenterFilters={}) {
  const page=Math.max(1,Math.trunc(filters.page??1)),take=50;
  const management=["Owner","Admin"].includes(role);
  const allowedStatuses=new Set<CommunicationDeliveryStatus>(["Pending","Scheduled","Processing","Sent","Delivered","Failed","Bounced","Rejected","Cancelled","Suppressed"]);
  const where:Prisma.CommunicationDeliveryWhereInput={
    companyId,
    ...(filters.view==="scheduled"?{status:{in:["Pending","Scheduled","Processing"]}}:{}),
    ...(filters.view==="failed"?{status:{in:["Failed","Bounced","Rejected"]}}:{}),
    ...(filters.channel?{channel:filters.channel}:{}),
    ...(filters.status&&allowedStatuses.has(filters.status as CommunicationDeliveryStatus)?{status:filters.status as CommunicationDeliveryStatus}:{}),
    ...(filters.customerId?{recipientType:"Customer" as const,recipientId:filters.customerId}:{}),
    ...(filters.sourceId?{event:{sourceId:filters.sourceId}}:{}),
    ...(filters.eventType?{event:{eventType:filters.eventType}}:{}),
  };
  const [deliveries,total,templates,rules,preference,notifications,unreadCount,customers]=await Promise.all([
    prisma.communicationDelivery.findMany({where,include:{event:{select:{eventType:true,sourceType:true,sourceId:true,occurredAt:true}},template:{select:{name:true}}},orderBy:{createdAt:"desc"},skip:(page-1)*take,take}),
    prisma.communicationDelivery.count({where}),
    management?prisma.communicationTemplate.findMany({where:{companyId},orderBy:[{eventType:"asc"},{name:"asc"}]}):Promise.resolve([]),
    management?prisma.communicationAutomationRule.findMany({where:{companyId},include:{template:{select:{name:true}}},orderBy:{eventType:"asc"}}):Promise.resolve([]),
    management?prisma.communicationPreference.findUnique({where:{companyId}}):Promise.resolve(null),
    prisma.systemNotification.findMany({where:{companyId,OR:[{userId},{userId:null}]},orderBy:{createdAt:"desc"},take:50}),
    prisma.systemNotification.count({where:{companyId,OR:[{userId},{userId:null}],readAt:null}}),
    prisma.customer.findMany({where:{companyId,email:{not:null}},select:{id:true,firstName:true,lastName:true,email:true},orderBy:[{lastName:"asc"},{firstName:"asc"}],take:200}),
  ]);
  return{deliveries,total,page,take,templates,rules,preference,notifications,unreadCount,customers,management};
}

export async function markNotificationRead(companyId:string,userId:string,id:string) {
  const row=await prisma.systemNotification.findFirst({where:{id,companyId,OR:[{userId},{userId:null}]},select:{id:true}});
  if(!row)throw new Error("Notification not found.");
  return prisma.systemNotification.update({where:{id:row.id},data:{readAt:new Date(),status:"Read"}});
}
export async function markAllNotificationsRead(companyId:string,userId:string) {
  return prisma.systemNotification.updateMany({where:{companyId,OR:[{userId},{userId:null}],readAt:null},data:{readAt:new Date(),status:"Read"}});
}
export async function listPortalCommunicationDeliveries(companyId:string,customerId:string) {
  return prisma.communicationDelivery.findMany({
    where:{companyId,recipientType:"Customer",recipientId:customerId,channel:"Portal",status:"Delivered",template:{customerVisible:true}},
    select:{id:true,subject:true,renderedBody:true,deliveredAt:true,createdAt:true,event:{select:{sourceType:true,sourceId:true}}},
    orderBy:{createdAt:"desc"},take:100,
  });
}
