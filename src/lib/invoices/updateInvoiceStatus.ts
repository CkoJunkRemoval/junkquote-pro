import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { prisma } from "../prisma";
import { canTransitionInvoiceStatus, type InvoiceWorkflowStatus } from "./statusWorkflow";

export async function updateInvoiceStatus(invoiceId: string, nextStatus: InvoiceWorkflowStatus) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, status: true, total: true } });
  if (!invoice) throw new Error("Invoice not found.");
  const current = invoice.status as InvoiceWorkflowStatus;
  if (!canTransitionInvoiceStatus(current, nextStatus)) throw new Error(`Invalid invoice status transition: ${current} to ${nextStatus}.`);
  return prisma.invoice.update({ where: { id: invoice.id }, data: { status: nextStatus, ...(nextStatus === "Paid" ? { paidDate: new Date(), balanceDue: 0 } : {}) } });
}
