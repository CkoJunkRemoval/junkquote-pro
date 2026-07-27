import { prisma } from "../prisma";
import { emitCommunicationEventForSource } from "@/lib/communications/engine";
import {recordEstimateEventInTransaction} from "@/lib/estimates/estimateEvents";

export async function sendInvoice(companyId: string, invoiceId: string, origin: string, createdByUserId: string) {
  const now = new Date();
  const updated = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true, displayNumber: true, status: true, estimateId: true, customer: { select: { email: true } } } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "Void" || invoice.status === "Cancelled") throw new Error("Void invoices cannot be sent.");
    if (!invoice.customer.email) throw new Error("Add a customer email address before sending this invoice.");
    const row = await tx.invoice.update({ where: { id: invoice.id }, data: { status: invoice.status === "Draft" ? "Sent" : invoice.status, sentAt: now, lastSentTo: invoice.customer.email } });
    await recordEstimateEventInTransaction(tx,{companyId,estimateId:invoice.estimateId,eventType:"Invoice Sent",category:"Invoice",actor:{type:"Employee",id:createdByUserId,userId:createdByUserId,displayName:"Team member"},summary:`Team member sent ${invoice.displayNumber ?? "invoice"} to ${invoice.customer.email}.`,visibility:"Both",metadata:{invoiceId:invoice.id,to:invoice.customer.email},attachments:[{referenceType:"Invoice",referenceId:invoice.id,displayName:invoice.displayNumber??"Invoice"}]});
    return row;
  });
  const delivery = await emitCommunicationEventForSource({companyId,eventType:"INVOICE_SENT",sourceType:"Invoice",sourceId:updated.id,dedupeKey:`INVOICE_SENT:${updated.id}:${now.toISOString()}`});
  return { invoice: updated, delivery, origin, createdByUserId };
}
