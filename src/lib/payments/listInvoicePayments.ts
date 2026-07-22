import { prisma } from "../prisma";

export async function listInvoicePayments(companyId: string, invoiceId: string) {
  const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true } });
  if (!invoice) throw new Error("Invoice not found.");
  return prisma.payment.findMany({ where: { invoiceId: invoice.id, companyId, invoice: { companyId } }, orderBy: { paymentDate: "desc" }, select: { id: true, amount: true, method: true, referenceNumber: true, paymentDate: true, notes: true, createdAt: true, updatedAt: true, refunds: { select: { id: true, amount: true, reason: true, refundedAt: true }, orderBy: { refundedAt: "desc" } } } });
}

export async function getPaymentReceiptData(companyId: string, paymentId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, companyId, invoice: { companyId, customer: { companyId }, estimate: { companyId } } },
    select: {
      id: true, amount: true, method: true, referenceNumber: true, paymentDate: true, notes: true,
      invoice: { select: { customerId: true, invoiceNumber: true, displayNumber: true, balanceDue: true, customer: { select: { firstName: true, lastName: true } }, company: { select: { name: true, displayName: true, logoUrl: true, primaryColor: true, secondaryColor: true } } } },
    },
  });
}

export const getReceiptData = getPaymentReceiptData;
