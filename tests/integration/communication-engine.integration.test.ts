import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  ensureDefaultCommunicationConfiguration, manualSendCommunication,
  processCommunicationEvent, recordCommunicationEvent,
} from "@/lib/communications/engine";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/communications/center";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

async function ready() {
  const fixtures=await createTenantFixtures();
  await prisma.customer.update({where:{id:fixtures.a.customer.id},data:{email:"customer-a@test.invalid"}});
  await prisma.customer.update({where:{id:fixtures.b.customer.id},data:{email:"customer-b@test.invalid"}});
  await ensureDefaultCommunicationConfiguration(fixtures.a.company.id);
  return fixtures;
}
const payload=(a:Awaited<ReturnType<typeof ready>>["a"])=>({
  customerId:a.customer.id,sourceLink:`/jobs/${a.job.id}`,
  variables:{"customer.firstName":"Customer","customer.fullName":"Customer A","company.name":"Company A","job.number":"JOB-1","job.arrivalWindow":"9:00–11:00","property.address":"1 Main St"},
});

describe("communication engine",()=>{
  beforeEach(resetIntegrationDatabase);afterAll(resetIntegrationDatabase);
  it("creates and deduplicates events and scheduled deliveries",async()=>{
    const{a}=await ready();
    const first=await recordCommunicationEvent({companyId:a.company.id,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:a.job.id,dedupeKey:"job-scheduled-1",payload:payload(a)});
    const second=await recordCommunicationEvent({companyId:a.company.id,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:a.job.id,dedupeKey:"job-scheduled-1",payload:payload(a)});
    expect(second.id).toBe(first.id);
    expect(await prisma.communicationEvent.count({where:{companyId:a.company.id,dedupeKey:"job-scheduled-1"}})).toBe(1);
    expect(await prisma.communicationDelivery.count({where:{eventId:first.id}})).toBe(2);
    expect(await prisma.backgroundJob.count({where:{companyId:a.company.id,type:"SendCommunication"}})).toBe(1);
  });
  it("enforces email opt-out and company channel settings",async()=>{
    const{a}=await ready();
    await prisma.communicationRecipientPreference.create({data:{companyId:a.company.id,customerId:a.customer.id,emailAllowed:false,optedOutAt:new Date()}});
    const event=await recordCommunicationEvent({companyId:a.company.id,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:a.job.id,dedupeKey:"opted-out",payload:payload(a)});
    expect(await prisma.communicationDelivery.count({where:{eventId:event.id,channel:"Email"}})).toBe(0);
    expect(await prisma.communicationDelivery.count({where:{eventId:event.id,channel:"Portal"}})).toBe(1);
  });
  it("keeps SMS disabled without a provider",async()=>{
    const{a}=await ready();
    const email=await prisma.communicationTemplate.findFirstOrThrow({where:{companyId:a.company.id,eventType:"JOB_SCHEDULED",channel:"Email"}});
    const sms=await prisma.communicationTemplate.create({data:{companyId:a.company.id,eventType:"JOB_SCHEDULED",channel:"Sms",name:"SMS placeholder",body:"Scheduled {{job.arrivalWindow}}"}});
    await prisma.communicationAutomationRule.create({data:{companyId:a.company.id,eventType:"JOB_SCHEDULED",channel:"Sms",templateId:sms.id,recipientType:"Customer"}});
    expect(email).toBeDefined();
    const event=await recordCommunicationEvent({companyId:a.company.id,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:a.job.id,dedupeKey:"sms-disabled",payload:payload(a)});
    expect(await prisma.communicationDelivery.count({where:{eventId:event.id,channel:"Sms"}})).toBe(0);
  });
  it("creates internal notifications and supports read state",async()=>{
    const{a}=await ready();
    const event=await recordCommunicationEvent({companyId:a.company.id,eventType:"ESTIMATE_APPROVED",sourceType:"Estimate",sourceId:a.estimate.id,dedupeKey:"approved",payload:{customerId:a.customer.id,variables:{"customer.firstName":"Customer","customer.fullName":"Customer A","company.name":"Company A","estimate.number":"EST-1"}}});
    const notification=await prisma.systemNotification.findFirstOrThrow({where:{companyId:a.company.id,sourceId:a.estimate.id}});
    expect(await prisma.communicationDelivery.count({where:{eventId:event.id,channel:"Internal"}})).toBe(1);
    await markNotificationRead(a.company.id,a.user.id,notification.id);
    expect((await prisma.systemNotification.findUniqueOrThrow({where:{id:notification.id}})).readAt).not.toBeNull();
    await prisma.systemNotification.create({data:{companyId:a.company.id,channel:"in-app",title:"Another",body:"Body"}});
    expect((await markAllNotificationsRead(a.company.id,a.user.id)).count).toBeGreaterThan(0);
  });
  it("isolates tenants and validates manual-send sources",async()=>{
    const{a,b}=await ready();
    await expect(processCommunicationEvent(b.company.id,"missing")).rejects.toThrow("not found");
    await expect(manualSendCommunication({companyId:a.company.id,actingUserId:a.user.id,sourceType:"Job",sourceId:b.job.id,customerId:a.customer.id,subject:"Hello",body:"Body"})).rejects.toThrow("not authorized");
    const delivery=await manualSendCommunication({companyId:a.company.id,actingUserId:a.user.id,sourceType:"Job",sourceId:a.job.id,customerId:a.customer.id,subject:"Hello",body:"<b>Safe body</b>"});
    expect(delivery).toMatchObject({companyId:a.company.id,channel:"Email",renderedBody:"Safe body"});
  });
  it("records processing failures without duplicate customer sends",async()=>{
    const{a}=await ready();
    const template=await prisma.communicationTemplate.findFirstOrThrow({where:{companyId:a.company.id,eventType:"JOB_SCHEDULED",channel:"Email"}});
    await prisma.communicationTemplate.update({where:{id:template.id},data:{body:"{{customer.firstName}}"}});
    const event=await recordCommunicationEvent({companyId:a.company.id,eventType:"JOB_SCHEDULED",sourceType:"Job",sourceId:a.job.id,dedupeKey:"retry-safe",payload:payload(a),process:false});
    await Promise.all([processCommunicationEvent(a.company.id,event.id),processCommunicationEvent(a.company.id,event.id)]);
    expect(await prisma.communicationDelivery.count({where:{eventId:event.id,channel:"Email"}})).toBe(1);
  });
});
