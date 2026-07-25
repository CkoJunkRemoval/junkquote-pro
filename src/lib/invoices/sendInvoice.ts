import { prisma } from "../prisma";
import { emitCommunicationEventForSource } from "@/lib/communications/engine";

export async function sendInvoice(companyId: string, invoiceId: string, origin: string, createdByUserId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { id: true, displayNumber: true, status: true, total: true, balanceDue: true, customer: { select: { email: true, firstName: true } }, company: { select: { displayName: true } } } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "Void" || invoice.status === "Cancelled") throw new Error("Void invoices cannot be sent.");
  if (!invoice.customer.email) throw new Error("Add a customer email address before sending this invoice.");
  const now = new Date();
  const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: invoice.status === "Draft" ? "Sent" : invoice.status, sentAt: now, lastSentTo: invoice.customer.email } });
  const delivery = await emitCommunicationEventForSource({companyId,eventType:"INVOICE_SENT",sourceType:"Invoice",sourceId:invoice.id,dedupeKey:`INVOICE_SENT:${invoice.id}:${now.toISOString()}`});
  return { invoice: updated, delivery, origin, createdByUserId };
}
