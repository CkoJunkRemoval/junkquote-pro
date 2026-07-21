import { prisma } from "../prisma";
import { sendOrEnqueueCommunication } from "@/lib/communications/queueCommunication";

export async function sendInvoice(companyId: string, invoiceId: string, origin: string, createdByUserId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { id: true, displayNumber: true, status: true, total: true, balanceDue: true, customer: { select: { email: true, firstName: true } }, company: { select: { displayName: true } } } });
  if (!invoice) throw new Error("Invoice not found.");
  if (invoice.status === "Void" || invoice.status === "Cancelled") throw new Error("Void invoices cannot be sent.");
  if (!invoice.customer.email) throw new Error("Add a customer email address before sending this invoice.");
  const link = `${origin}/portal/invoices/${invoice.id}`;
  const delivery = await sendOrEnqueueCommunication(companyId, { channel: "email", to: invoice.customer.email, subject: `${invoice.displayNumber ?? "Invoice"} from ${invoice.company.displayName}`, body: `Hi ${invoice.customer.firstName},\n\nYour invoice total is $${invoice.total.toFixed(2)} with $${invoice.balanceDue.toFixed(2)} due. View your invoice and payment history here: ${link}\n\nThank you,\n${invoice.company.displayName}`, idempotencyKey: `invoice:${invoice.id}:${Date.now()}`, createdByUserId });
  const now = new Date();
  const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status: invoice.status === "Draft" ? "Sent" : invoice.status, sentAt: now, lastSentTo: invoice.customer.email } });
  return { invoice: updated, delivery };
}
