import { prisma } from "../prisma";
import { canTransitionInvoiceStatus, type InvoiceWorkflowStatus } from "./statusWorkflow";
import { syncPricingOutcomeForInvoice } from "@/lib/smartPricing/outcomes";
import { transitionEstimate } from "@/lib/estimates/estimateLifecycle";
export async function updateInvoiceStatus(companyId:string,invoiceId:string,nextStatus:InvoiceWorkflowStatus) {
  const invoice=await prisma.invoice.findFirst({where:{id:invoiceId,companyId,customer:{companyId},estimate:{companyId},OR:[{jobId:null},{job:{companyId}}]},select:{id:true,status:true,total:true,estimateId:true,estimate:{select:{status:true}}}}); if(!invoice)throw new Error("Invoice not found.");
  const current=invoice.status as InvoiceWorkflowStatus;if(!canTransitionInvoiceStatus(current,nextStatus))throw new Error(`Invalid invoice status transition: ${current} to ${nextStatus}.`);const now=new Date();
  const updated=await prisma.invoice.update({where:{id:invoice.id},data:{status:nextStatus,...(nextStatus==="Sent"?{sentAt:now}:{}),...(nextStatus==="Viewed"?{viewedAt:now}:{}),...(nextStatus==="Void"?{voidedAt:now}:{}),...(nextStatus==="Paid"?{paidDate:now,balanceDue:0}:{})}});
  if(nextStatus==="Paid"&&invoice.estimate.status==="Invoiced")await transitionEstimate(companyId,invoice.estimateId,"Paid",{actor:{label:"Team member"},metadata:{invoiceId}});
  await syncPricingOutcomeForInvoice(companyId,invoice.id);return updated;
}
