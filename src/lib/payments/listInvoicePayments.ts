import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { prisma } from "../prisma";

export async function listInvoicePayments(invoiceId: string) {
  return prisma.payment.findMany({ where: { invoiceId, companyId: DEVELOPMENT_COMPANY_ID }, orderBy: { paymentDate: "desc" }, select: { id: true, amount: true, method: true, referenceNumber: true, paymentDate: true, notes: true, createdAt: true, updatedAt: true } });
}

export async function getPaymentReceiptData(paymentId: string) {
  return prisma.payment.findFirst({
    where: { id: paymentId, companyId: DEVELOPMENT_COMPANY_ID },
    select: {
      id: true, amount: true, method: true, referenceNumber: true, paymentDate: true, notes: true,
      invoice: { select: { invoiceNumber: true, displayNumber: true, balanceDue: true, customer: { select: { firstName: true, lastName: true } }, company: { select: { name: true, displayName: true, logoUrl: true, primaryColor: true, secondaryColor: true } } } },
    },
  });
}
