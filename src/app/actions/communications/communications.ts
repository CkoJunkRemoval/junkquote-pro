"use server";
import { revalidatePath } from "next/cache";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { databaseJobQueue } from "@/lib/backgroundJobs/databaseQueue";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/communications/center";
import { ensureDefaultCommunicationConfiguration, manualSendCommunication } from "@/lib/communications/engine";
import { validateCommunicationTemplate } from "@/lib/communications/templates";
import { prisma } from "@/lib/prisma";

export async function markNotificationReadAction(formData:FormData){const c=await requireCompanyRole("Owner","Admin","Office","Crew");await markNotificationRead(c.companyId,c.user.id,String(formData.get("id")??""));revalidatePath("/communications")}
export async function markAllNotificationsReadAction(){const c=await requireCompanyRole("Owner","Admin","Office","Crew");await markAllNotificationsRead(c.companyId,c.user.id);revalidatePath("/communications")}
export async function retryCommunicationAction(formData:FormData){
  const c=await requireCompanyRole("Owner","Admin","Office");
  const deliveryId=String(formData.get("deliveryId")??"");
  const delivery=await prisma.communicationDelivery.findFirst({where:{id:deliveryId,companyId:c.companyId,status:{in:["Failed","Bounced","Rejected"]}},select:{backgroundJobId:true}});
  if(!delivery?.backgroundJobId)throw new Error("This delivery cannot be retried.");
  await databaseJobQueue.retry(c.companyId,delivery.backgroundJobId);revalidatePath("/communications");
}
export async function saveCommunicationTemplateAction(formData:FormData){
  const c=await requireCompanyRole("Owner","Admin");const id=String(formData.get("id")??""),subject=String(formData.get("subject")??"").trim(),body=String(formData.get("body")??"").trim();
  validateCommunicationTemplate(subject,body);
  const template=await prisma.communicationTemplate.findFirst({where:{id,companyId:c.companyId},select:{id:true}});
  if(!template)throw new Error("Template not found.");
  await prisma.communicationTemplate.update({where:{id:template.id},data:{subject:subject||null,body,active:formData.get("active")==="on"}});revalidatePath("/communications");
}
export async function saveCommunicationPreferencesAction(formData:FormData){
  const c=await requireCompanyRole("Owner","Admin");await ensureDefaultCommunicationConfiguration(c.companyId);
  const timeZone=String(formData.get("timeZone")??"").trim(),quietHoursStart=String(formData.get("quietHoursStart")??"").trim()||null,quietHoursEnd=String(formData.get("quietHoursEnd")??"").trim()||null;
  if(!timeZone)throw new Error("Time zone is required.");
  await prisma.communicationPreference.update({where:{companyId:c.companyId},data:{timeZone,quietHoursStart,quietHoursEnd,emailEnabled:formData.get("emailEnabled")==="on",smsEnabled:false,internalEnabled:formData.get("internalEnabled")==="on",portalEnabled:formData.get("portalEnabled")==="on"}});
  revalidatePath("/communications");
}
export async function toggleCommunicationRuleAction(formData:FormData){
  const c=await requireCompanyRole("Owner","Admin");const id=String(formData.get("id")??"");
  const rule=await prisma.communicationAutomationRule.findFirst({where:{id,companyId:c.companyId},select:{id:true,enabled:true}});
  if(!rule)throw new Error("Automation rule not found.");
  await prisma.communicationAutomationRule.update({where:{id:rule.id},data:{enabled:!rule.enabled}});revalidatePath("/communications");
}
export async function manualSendCommunicationAction(formData:FormData){
  const c=await requireCompanyRole("Owner","Admin","Office");
  await manualSendCommunication({companyId:c.companyId,actingUserId:c.user.id,sourceType:String(formData.get("sourceType")??"Customer"),sourceId:String(formData.get("sourceId")??formData.get("customerId")??""),customerId:String(formData.get("customerId")??""),subject:String(formData.get("subject")??""),body:String(formData.get("body")??"")});
  revalidatePath("/communications");
}
