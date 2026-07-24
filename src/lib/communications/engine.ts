import type { CommunicationChannel, CommunicationRecipientType, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueCommunication } from "./queueCommunication";
import { beginDelivery, markDeliveryFailed } from "./delivery";
import { nextAllowedDelivery } from "./quietHours";
import { renderCommunicationTemplate, sanitizeCommunicationText, validateCommunicationTemplate } from "./templates";

export const communicationEventTypes = [
  "ESTIMATE_CREATED","ESTIMATE_SENT","ESTIMATE_APPROVED","ESTIMATE_DECLINED","ESTIMATE_EXPIRING",
  "JOB_SCHEDULED","JOB_RESCHEDULED","JOB_CONFIRMED","CREW_ASSIGNED","JOB_EN_ROUTE","JOB_ARRIVED",
  "JOB_DELAYED","JOB_COMPLETED","JOB_CANCELLED","INVOICE_CREATED","INVOICE_SENT","INVOICE_OVERDUE",
  "PAYMENT_RECEIVED","PAYMENT_FAILED","REVIEW_REQUEST_READY",
] as const;
export type CommunicationEventType = typeof communicationEventTypes[number];

type EventPayload = {
  customerId?: string;
  customerEmail?: string;
  employeeId?: string;
  userId?: string;
  portalAccessId?: string;
  destination?: string;
  sourceLink?: string;
  variables?: Record<string, string | number | null>;
  urgent?: boolean;
};

const defaults: Array<{ eventType: CommunicationEventType; name: string; subject: string; body: string; urgent?: boolean; delayMinutes?: number; channel?:CommunicationChannel; recipientType?:CommunicationRecipientType; customerVisible?:boolean }> = [
  { eventType:"JOB_SCHEDULED", name:"Job scheduled", subject:"Your appointment is scheduled", body:"Hi {{customer.firstName}},\n\nYour appointment with {{company.name}} is scheduled for {{job.arrivalWindow}} at {{property.address}}." },
  { eventType:"JOB_RESCHEDULED", name:"Job rescheduled", subject:"Your appointment was updated", body:"Hi {{customer.firstName}},\n\nYour appointment with {{company.name}} is now scheduled for {{job.arrivalWindow}}." },
  { eventType:"JOB_DELAYED", name:"Job delayed", subject:"Update about your appointment", body:"Hi {{customer.firstName}},\n\nOur crew is running approximately {{job.delayMinutes}} minutes behind. We apologize for the delay.", urgent:true },
  { eventType:"ESTIMATE_SENT", name:"Estimate sent", subject:"Your estimate from {{company.name}}", body:"Hi {{customer.firstName}},\n\nEstimate {{estimate.number}} totaling {{estimate.total}} is ready: {{estimate.approvalUrl}}" },
  { eventType:"ESTIMATE_APPROVED", name:"Estimate approved", subject:"Your estimate was approved", body:"Hi {{customer.firstName}},\n\nEstimate {{estimate.number}} has been approved." },
  { eventType:"INVOICE_SENT", name:"Invoice sent", subject:"Invoice {{invoice.number}} from {{company.name}}", body:"Hi {{customer.firstName}},\n\nInvoice {{invoice.number}} has a balance of {{invoice.balance}}. {{invoice.paymentUrl}}" },
  { eventType:"INVOICE_OVERDUE", name:"Invoice overdue", subject:"Invoice {{invoice.number}} is overdue", body:"Hi {{customer.firstName}},\n\nInvoice {{invoice.number}} has an overdue balance of {{invoice.balance}}.", delayMinutes:0 },
  { eventType:"PAYMENT_RECEIVED", name:"Payment received", subject:"Payment received", body:"We received your payment of {{payment.amount}} for invoice {{invoice.number}}." },
  { eventType:"REVIEW_REQUEST_READY", name:"Review request", subject:"How did we do?", body:"Thank you for choosing {{company.name}}. We would appreciate your feedback.", delayMinutes:1440 },
  { eventType:"ESTIMATE_APPROVED", name:"Internal estimate approval", subject:"Estimate approved", body:"{{customer.fullName}} approved estimate {{estimate.number}}.", channel:"Internal", recipientType:"User", customerVisible:false },
  { eventType:"JOB_DELAYED", name:"Internal job delay", subject:"Job delayed", body:"Job {{job.number}} is delayed.", channel:"Internal", recipientType:"User", customerVisible:false, urgent:true },
  { eventType:"INVOICE_OVERDUE", name:"Internal overdue invoice", subject:"Invoice overdue", body:"Invoice {{invoice.number}} has an overdue balance of {{invoice.balance}}.", channel:"Internal", recipientType:"User", customerVisible:false },
  { eventType:"JOB_SCHEDULED", name:"Portal appointment", subject:"Appointment scheduled", body:"Your appointment is scheduled for {{job.arrivalWindow}} at {{property.address}}.", channel:"Portal", recipientType:"Customer" },
  { eventType:"JOB_DELAYED", name:"Portal delay", subject:"Appointment update", body:"Our crew is running approximately {{job.delayMinutes}} minutes behind.", channel:"Portal", recipientType:"Customer", urgent:true },
  { eventType:"PAYMENT_RECEIVED", name:"Portal payment receipt", subject:"Payment received", body:"We received your payment of {{payment.amount}} for invoice {{invoice.number}}.", channel:"Portal", recipientType:"Customer" },
];

export async function ensureDefaultCommunicationConfiguration(companyId: string) {
  const company = await prisma.company.findFirst({ where: { id: companyId }, select: { timezone: true } });
  if (!company) throw new Error("Company not found.");
  await prisma.communicationPreference.upsert({
    where: { companyId },
    create: { companyId, timeZone: company.timezone },
    update: {},
  });
  for (const item of defaults) {
    validateCommunicationTemplate(item.subject, item.body);
    const channel=item.channel??"Email",recipientType=item.recipientType??"Customer";
    const template = await prisma.communicationTemplate.upsert({
      where: { companyId_eventType_channel_name: { companyId, eventType: item.eventType, channel, name: item.name } },
      create: { companyId, eventType: item.eventType, channel, name: item.name, subject: item.subject, body: item.body, defaultTemplate: true, delayMinutes: item.delayMinutes ?? 0,customerVisible:item.customerVisible??true },
      update: {},
    });
    await prisma.communicationAutomationRule.upsert({
      where: { companyId_eventType_channel_recipientType: { companyId, eventType: item.eventType, channel, recipientType } },
      create: { companyId, eventType: item.eventType, channel, templateId: template.id, recipientType, delayMinutes: item.delayMinutes ?? 0, urgent: item.urgent ?? false },
      update: {},
    });
  }
}

export async function recordCommunicationEvent(input: {
  companyId: string;
  eventType: CommunicationEventType;
  sourceType: string;
  sourceId: string;
  dedupeKey: string;
  payload?: EventPayload;
  occurredAt?: Date;
  process?: boolean;
}) {
  const event = await prisma.communicationEvent.upsert({
    where: { companyId_dedupeKey: { companyId: input.companyId, dedupeKey: input.dedupeKey } },
    create: {
      companyId: input.companyId, eventType: input.eventType, sourceType: input.sourceType.slice(0,80),
      sourceId: input.sourceId, dedupeKey: input.dedupeKey.slice(0,240),
      payload: (input.payload ?? {}) as Prisma.InputJsonValue, occurredAt: input.occurredAt,
    },
    update: {},
  });
  if (input.process !== false && event.status === "Pending") await processCommunicationEvent(input.companyId, event.id);
  return event;
}

export async function processCommunicationEvent(companyId: string, eventId: string) {
  await ensureDefaultCommunicationConfiguration(companyId);
  const event = await prisma.communicationEvent.findFirst({ where: { id: eventId, companyId }, select: { id:true,eventType:true,sourceType:true,sourceId:true,payload:true,status:true } });
  if (!event) throw new Error("Communication event not found.");
  if (event.status === "Processed" || event.status === "Cancelled") return { duplicate: true, deliveries: [] };
  const claimed = await prisma.communicationEvent.updateMany({ where: { id:event.id, companyId, status:"Pending" }, data: { status:"Processing" } });
  if (!claimed.count && event.status !== "Failed") return { duplicate: true, deliveries: [] };
  const payload = asPayload(event.payload);
  try {
    const [company, preference, rules] = await Promise.all([
      prisma.company.findFirstOrThrow({ where: { id:companyId }, select: { displayName:true,name:true,phone:true,email:true,timezone:true } }),
      prisma.communicationPreference.findUnique({ where: { companyId } }),
      prisma.communicationAutomationRule.findMany({ where: { companyId,eventType:event.eventType,enabled:true }, include: { template:true } }),
    ]);
    const deliveries = [];
    for (const rule of rules) {
      if (!channelEnabled(rule.channel, preference)) continue;
      const recipient = rule.channel==="Internal"&&!payload.userId?{id:null,destination:"company",allowed:true}:await resolveRecipient(companyId, rule.recipientType, rule.channel, payload);
      if (!recipient || !recipient.allowed) continue;
      const subject = rule.template.subject ? renderCommunicationTemplate(rule.template.subject, payload.variables ?? {}).value : null;
      const rendered = renderCommunicationTemplate(rule.template.body, payload.variables ?? {});
      const base = new Date(Date.now() + Math.max(0, rule.delayMinutes + rule.template.delayMinutes) * 60000);
      const quiet = nextAllowedDelivery({ now:base,timeZone:preference?.timeZone ?? company.timezone,quietHoursStart:preference?.quietHoursStart,quietHoursEnd:preference?.quietHoursEnd,urgent:rule.urgent || payload.urgent });
      deliveries.push(await createDelivery({
        companyId,eventId:event.id,templateId:rule.templateId,channel:rule.channel,recipientType:rule.recipientType,
        recipientId:recipient.id,destination:recipient.destination,subject,body:rendered.value,scheduledFor:quiet.scheduledFor,
        delayReason:[quiet.reason,...rendered.warnings].filter(Boolean).join(" ") || null,
        sourceType:event.sourceType,sourceId:event.sourceId,sourceLink:payload.sourceLink,
      }));
    }
    await prisma.communicationEvent.update({ where: { id:event.id }, data: { status:"Processed",processedAt:new Date(),failureReason:null } });
    return { duplicate:false,deliveries };
  } catch (error) {
    await prisma.communicationEvent.update({ where: { id:event.id }, data: { status:"Failed",failureReason:safeError(error) } }).catch(() => undefined);
    throw error;
  }
}

async function createDelivery(input: {
  companyId:string;eventId:string;templateId:string|null;channel:CommunicationChannel;recipientType:CommunicationRecipientType;
  recipientId:string|null;destination:string;subject:string|null;body:string;scheduledFor:Date;delayReason:string|null;
  sourceType:string;sourceId:string;sourceLink?:string;
}) {
  const key = `event:${input.eventId}:${input.channel}:${input.recipientType}:${input.recipientId ?? input.destination}`;
  const providerChannel = input.channel === "Email" ? "email" : input.channel === "Sms" ? "sms" : "reminder";
  const base = await beginDelivery({ companyId:input.companyId,idempotencyKey:key,provider:input.channel === "Email" ? "queue" : "internal",message:{channel:providerChannel,to:input.destination,subject:input.subject ?? undefined,body:input.body} });
  const status = input.channel === "Sms" ? "Suppressed" : input.channel === "Email" ? "Scheduled" : "Delivered";
  const delivery = await prisma.communicationDelivery.update({
    where:{id:base.id},data:{
      eventId:input.eventId,templateId:input.templateId,recipientType:input.recipientType,recipientId:input.recipientId,
      channel:input.channel,destination:input.destination,subject:input.subject,renderedBody:input.body,scheduledFor:input.scheduledFor,
      delayReason:input.channel === "Sms" ? "SMS provider is not configured." : input.delayReason,status,
      ...(status === "Delivered" ? { deliveredAt:new Date() } : {}),
    },
  });
  if (input.channel === "Internal") await prisma.systemNotification.create({ data: { companyId:input.companyId,userId:input.recipientId,channel:"in-app",title:input.subject ?? "Notification",body:input.body,status:"Delivered",sourceType:input.sourceType,sourceId:input.sourceId,link:input.sourceLink } });
  if (input.channel === "Email") {
    try {
      const job=await enqueueCommunication(input.companyId,{channel:"email",to:input.destination,subject:input.subject ?? undefined,body:input.body,idempotencyKey:key,availableAt:input.scheduledFor});
      await prisma.communicationDelivery.update({where:{id:delivery.id},data:{backgroundJobId:job.id}});
    } catch (error) {
      await markDeliveryFailed(delivery.id,error);
      throw error;
    }
  }
  return delivery;
}

export async function cancelPendingCommunicationForSource(companyId:string,sourceType:string,sourceId:string,eventTypes?:CommunicationEventType[]) {
  const deliveries=await prisma.communicationDelivery.findMany({where:{companyId,status:{in:["Pending","Scheduled"]},event:{sourceType,sourceId,...(eventTypes?{eventType:{in:eventTypes}}:{})}},select:{id:true,backgroundJobId:true}});
  if(!deliveries.length)return 0;
  await prisma.$transaction(async(tx)=>{
    await tx.communicationDelivery.updateMany({where:{id:{in:deliveries.map((row)=>row.id)}},data:{status:"Cancelled",failureReason:"Cancelled because the source record changed."}});
    await tx.backgroundJob.updateMany({where:{id:{in:deliveries.flatMap((row)=>row.backgroundJobId?[row.backgroundJobId]:[])},companyId,status:"Pending"},data:{status:"Cancelled",completedAt:new Date()}});
  });
  return deliveries.length;
}

async function resolveRecipient(companyId:string,type:CommunicationRecipientType,channel:CommunicationChannel,payload:EventPayload) {
  if (type === "Customer") {
    if (!payload.customerId) return null;
    const customer = await prisma.customer.findFirst({ where:{id:payload.customerId,companyId},select:{id:true,email:true} });
    if (!customer?.email) return null;
    const preference = await prisma.communicationRecipientPreference.findUnique({ where:{companyId_customerId:{companyId,customerId:customer.id}} });
    const allowed=channel==="Portal"?preference?.portalAllowed!==false:channel==="Sms"?preference?.smsAllowed===true:preference?.emailAllowed!==false&&!preference?.optedOutAt;
    return { id:customer.id,destination:customer.email,allowed };
  }
  if (type === "Employee") {
    if (!payload.employeeId) return null;
    const employee = await prisma.employee.findFirst({ where:{id:payload.employeeId,companyId},select:{id:true,email:true,userId:true} });
    if (!employee) return null;
    const preference = await prisma.communicationRecipientPreference.findUnique({ where:{companyId_employeeId:{companyId,employeeId:employee.id}} });
    const allowed=channel==="Portal"?preference?.portalAllowed!==false:channel==="Sms"?preference?.smsAllowed===true:preference?.emailAllowed!==false&&!preference?.optedOutAt;
    return { id:employee.userId ?? employee.id,destination:employee.email ?? employee.id,allowed };
  }
  if (type === "User") return payload.userId ? { id:payload.userId,destination:payload.destination ?? payload.userId,allowed:true } : null;
  return payload.portalAccessId ? { id:payload.portalAccessId,destination:payload.portalAccessId,allowed:true } : null;
}

function channelEnabled(channel:CommunicationChannel, preference: {emailEnabled:boolean;smsEnabled:boolean;internalEnabled:boolean;portalEnabled:boolean}|null) {
  if (channel === "Email") return preference?.emailEnabled !== false;
  if (channel === "Sms") return preference?.smsEnabled === true;
  if (channel === "Internal") return preference?.internalEnabled !== false;
  return preference?.portalEnabled !== false;
}
function asPayload(value: Prisma.JsonValue): EventPayload { return value && typeof value === "object" && !Array.isArray(value) ? value as EventPayload : {}; }
function safeError(error:unknown) { return (error instanceof Error ? error.message : "Communication processing failed.").replace(/[\r\n]+/g," ").slice(0,500); }

export async function manualSendCommunication(input:{
  companyId:string;actingUserId:string;sourceType:string;sourceId:string;customerId:string;subject:string;body:string;
}) {
  const customer = await prisma.customer.findFirst({ where:{id:input.customerId,companyId:input.companyId},select:{id:true,email:true} });
  if (!customer?.email) throw new Error("Customer email is unavailable.");
  const authorized = input.sourceType === "Customer" ? input.sourceId === customer.id
    : input.sourceType === "Job" ? Boolean(await prisma.job.findFirst({where:{id:input.sourceId,companyId:input.companyId,customerId:customer.id},select:{id:true}}))
    : input.sourceType === "Estimate" ? Boolean(await prisma.estimate.findFirst({where:{id:input.sourceId,companyId:input.companyId,customerId:customer.id},select:{id:true}}))
    : input.sourceType === "Invoice" ? Boolean(await prisma.invoice.findFirst({where:{id:input.sourceId,companyId:input.companyId,customerId:customer.id},select:{id:true}}))
    : false;
  if(!authorized)throw new Error("Communication source is not authorized for this customer.");
  const body = sanitizeCommunicationText(input.body), subject = sanitizeCommunicationText(input.subject);
  if (!body || !subject) throw new Error("Subject and message are required.");
  const event = await prisma.communicationEvent.create({ data:{companyId:input.companyId,eventType:"MANUAL_SEND",sourceType:input.sourceType,sourceId:input.sourceId,payload:{customerId:customer.id},dedupeKey:`manual:${input.actingUserId}:${crypto.randomUUID()}`,status:"Processed",processedAt:new Date()} });
  return createDelivery({companyId:input.companyId,eventId:event.id,templateId:null,channel:"Email",recipientType:"Customer",recipientId:customer.id,destination:customer.email,subject,body,scheduledFor:new Date(),delayReason:null,sourceType:input.sourceType,sourceId:input.sourceId});
}

export async function emitCommunicationEventForSource(input:{
  companyId:string;eventType:CommunicationEventType;sourceType:"Estimate"|"Job"|"Invoice"|"Payment";sourceId:string;dedupeKey:string;
  extraVariables?:Record<string,string|number|null>;urgent?:boolean;
}) {
  try {
    const context=await sourceContext(input.companyId,input.sourceType,input.sourceId);
    if(!context)return null;
    return await recordCommunicationEvent({companyId:input.companyId,eventType:input.eventType,sourceType:input.sourceType,sourceId:input.sourceId,dedupeKey:input.dedupeKey,payload:{...context,payloadVersion:1,urgent:input.urgent,variables:{...context.variables,...input.extraVariables}} as EventPayload});
  } catch (error) {
    console.error(JSON.stringify({event:"communication.outbox_failed",companyId:input.companyId,eventType:input.eventType,sourceType:input.sourceType,sourceId:input.sourceId,error:safeError(error)}));
    return null;
  }
}

async function sourceContext(companyId:string,sourceType:"Estimate"|"Job"|"Invoice"|"Payment",sourceId:string) {
  const base=process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/,"")??"";
  if(sourceType==="Job"){
    const row=await prisma.job.findFirst({where:{id:sourceId,companyId},select:{id:true,jobNumber:true,schedulingStatus:true,scheduledStart:true,arrivalWindowStart:true,arrivalWindowEnd:true,customer:{select:{id:true,email:true,firstName:true,lastName:true}},property:{select:{address:true,city:true,state:true,zip:true}},company:{select:{displayName:true,phone:true,email:true}}}});
    if(!row)return null;
    return{customerId:row.customer.id,customerEmail:row.customer.email??undefined,sourceLink:`/jobs/${row.id}`,variables:commonVariables(row.company,row.customer,row.property,{"job.number":row.jobNumber??"","job.date":formatDate(row.scheduledStart),"job.arrivalWindow":arrival(row.arrivalWindowStart,row.arrivalWindowEnd,row.scheduledStart),"job.status":row.schedulingStatus,"job.portalUrl":base?`${base}/portal/jobs/${row.id}`:""})};
  }
  if(sourceType==="Estimate"){
    const row=await prisma.estimate.findFirst({where:{id:sourceId,companyId},select:{id:true,displayNumber:true,pricingTotal:true,approvalTokenExpiresAt:true,approvalToken:true,customer:{select:{id:true,email:true,firstName:true,lastName:true}},property:{select:{address:true,city:true,state:true,zip:true}},company:{select:{displayName:true,phone:true,email:true}}}});
    if(!row)return null;
    return{customerId:row.customer.id,customerEmail:row.customer.email??undefined,sourceLink:`/estimates/${row.id}`,variables:commonVariables(row.company,row.customer,row.property,{"estimate.number":row.displayNumber??"","estimate.total":money(row.pricingTotal),"estimate.expirationDate":formatDate(row.approvalTokenExpiresAt),"estimate.approvalUrl":base&&row.approvalToken?`${base}/approve/${row.approvalToken}`:""})};
  }
  if(sourceType==="Invoice"){
    const row=await prisma.invoice.findFirst({where:{id:sourceId,companyId},select:{id:true,displayNumber:true,total:true,balanceDue:true,dueDate:true,customer:{select:{id:true,email:true,firstName:true,lastName:true}},property:{select:{address:true,city:true,state:true,zip:true}},company:{select:{displayName:true,phone:true,email:true}}}});
    if(!row)return null;
    return{customerId:row.customer.id,customerEmail:row.customer.email??undefined,sourceLink:`/invoices/${row.id}`,variables:commonVariables(row.company,row.customer,row.property,{"invoice.number":row.displayNumber??"","invoice.total":money(row.total),"invoice.balance":money(row.balanceDue),"invoice.dueDate":formatDate(row.dueDate),"invoice.paymentUrl":base?`${base}/portal/invoices/${row.id}`:""})};
  }
  const payment=await prisma.payment.findFirst({where:{id:sourceId,companyId},select:{id:true,amount:true,paymentDate:true,invoice:{select:{id:true,displayNumber:true,total:true,balanceDue:true,dueDate:true,customer:{select:{id:true,email:true,firstName:true,lastName:true}},property:{select:{address:true,city:true,state:true,zip:true}},company:{select:{displayName:true,phone:true,email:true}}}}}});
  if(!payment)return null;const row=payment.invoice;
  return{customerId:row.customer.id,customerEmail:row.customer.email??undefined,sourceLink:`/invoices/${row.id}`,variables:commonVariables(row.company,row.customer,row.property,{"invoice.number":row.displayNumber??"","invoice.total":money(row.total),"invoice.balance":money(row.balanceDue),"invoice.dueDate":formatDate(row.dueDate),"payment.amount":money(payment.amount),"payment.date":formatDate(payment.paymentDate)})};
}
function commonVariables(company:{displayName:string;phone:string|null;email:string|null},customer:{firstName:string;lastName:string},property:{address:string;city:string;state:string;zip:string},extra:Record<string,string>) {
  return{"company.name":company.displayName,"company.phone":company.phone??"","company.email":company.email??"","customer.firstName":customer.firstName,"customer.lastName":customer.lastName,"customer.fullName":`${customer.firstName} ${customer.lastName}`.trim(),"property.address":property.address,"property.city":property.city,"property.state":property.state,"property.zip":property.zip,...extra};
}
const money=(value:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(value);
const formatDate=(value:Date|null)=>value?value.toLocaleDateString("en-US"):"";
const arrival=(start:Date|null,end:Date|null,fallback:Date|null)=>start&&end?`${start.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}–${end.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}`:fallback?fallback.toLocaleString("en-US"):"";
