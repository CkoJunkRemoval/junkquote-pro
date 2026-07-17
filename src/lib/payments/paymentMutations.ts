import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { prisma } from "../prisma";
import { deriveInvoicePaymentState } from "./paymentRecalculation";

export interface PaymentInput { invoiceId: string; amount: number; method: PaymentMethod; referenceNumber?: string; paymentDate: Date; notes?: string; }
export interface UpdatePaymentInput { id: string; amount: number; method: PaymentMethod; referenceNumber?: string; paymentDate: Date; notes?: string; }

function validateAmount(amount: number) { if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be positive."); }

async function recalculateInvoice(tx: Prisma.TransactionClient, invoiceId: string) {
  const invoice = await tx.invoice.findUnique({ where: { id: invoiceId }, select: { id: true, total: true, dueDate: true } });
  if (!invoice) throw new Error("Invoice not found.");
  const paymentTotal = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  const state = deriveInvoicePaymentState(invoice.total, paymentTotal._sum.amount ?? 0, invoice.dueDate);
  await tx.invoice.update({ where: { id: invoice.id }, data: state });
  return state;
}

export async function addPayment(input: PaymentInput) {
  validateAmount(input.amount);
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: input.invoiceId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, companyId: true, total: true, status: true } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "Cancelled") throw new Error("Cancelled invoices cannot receive payments.");
    const existing = await tx.payment.aggregate({ where: { invoiceId: invoice.id }, _sum: { amount: true } });
    if ((existing._sum.amount ?? 0) + input.amount > invoice.total + 0.00001) throw new Error("Payment cannot exceed the invoice total.");
    const payment = await tx.payment.create({ data: { companyId: invoice.companyId, invoiceId: invoice.id, amount: input.amount, method: input.method, referenceNumber: input.referenceNumber?.trim() || null, paymentDate: input.paymentDate, notes: input.notes?.trim() || "" } });
    const invoiceState = await recalculateInvoice(tx, invoice.id);
    return { payment, invoiceState };
  });
}

export async function updatePayment(input: UpdatePaymentInput) {
  validateAmount(input.amount);
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: input.id, companyId: DEVELOPMENT_COMPANY_ID }, include: { invoice: { select: { id: true, total: true, status: true } } } });
    if (!payment) throw new Error("Payment not found.");
    if (payment.invoice.status === "Cancelled") throw new Error("Cancelled invoices cannot receive payments.");
    const otherPayments = await tx.payment.aggregate({ where: { invoiceId: payment.invoiceId, id: { not: payment.id } }, _sum: { amount: true } });
    if ((otherPayments._sum.amount ?? 0) + input.amount > payment.invoice.total + 0.00001) throw new Error("Payment cannot exceed the invoice total.");
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { amount: input.amount, method: input.method, referenceNumber: input.referenceNumber?.trim() || null, paymentDate: input.paymentDate, notes: input.notes?.trim() || "" } });
    const invoiceState = await recalculateInvoice(tx, payment.invoiceId);
    return { payment: updated, invoiceState };
  });
}

export async function deletePayment(paymentId: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, invoiceId: true } });
    if (!payment) throw new Error("Payment not found.");
    await tx.payment.delete({ where: { id: payment.id } });
    const invoiceState = await recalculateInvoice(tx, payment.invoiceId);
    return { invoiceState };
  });
}
