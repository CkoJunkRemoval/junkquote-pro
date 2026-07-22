import type { PaymentMethod, Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import { deriveInvoicePaymentState } from "./paymentRecalculation";
import { syncPricingOutcomeForInvoice } from "@/lib/smartPricing/outcomes";
import {recordEstimateEventInTransaction} from "@/lib/estimates/estimateEvents";

export interface PaymentInput { amount: number; method: PaymentMethod; referenceNumber?: string; paymentDate: Date; notes?: string; }
export type UpdatePaymentInput = PaymentInput;

function validateAmount(amount: number) { if (!Number.isFinite(amount) || amount <= 0) throw new Error("Payment amount must be positive."); }

async function recalculateInvoice(tx: Prisma.TransactionClient, companyId: string, invoiceId: string) {
  const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { id: true, total: true, dueDate: true } });
  if (!invoice) throw new Error("Invoice not found.");
  const paymentTotal = await tx.payment.aggregate({ where: { invoiceId, companyId, invoice: { companyId } }, _sum: { amount: true } });
  const refundTotal = await tx.refund.aggregate({ where: { invoiceId, companyId, invoice: { companyId } }, _sum: { amount: true } });
  const state = deriveInvoicePaymentState(invoice.total, (paymentTotal._sum.amount ?? 0) - (refundTotal._sum.amount ?? 0), invoice.dueDate);
  await tx.invoice.update({ where: { id: invoice.id }, data: state });
  return state;
}

export async function recordPayment(companyId: string, invoiceId: string, input: PaymentInput) {
  validateAmount(input.amount);
  const result = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true, companyId: true, total: true, status: true, estimateId:true, displayNumber:true } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status === "Cancelled") throw new Error("Cancelled invoices cannot receive payments.");
    if (invoice.status === "Void") throw new Error("Void invoices cannot receive payments.");
    const existing = await tx.payment.aggregate({ where: { invoiceId: invoice.id, companyId, invoice: { companyId } }, _sum: { amount: true } });
    if ((existing._sum.amount ?? 0) + input.amount > invoice.total + 0.00001) throw new Error("Payment cannot exceed the invoice total.");
    const payment = await tx.payment.create({ data: { companyId, invoiceId: invoice.id, amount: input.amount, method: input.method, referenceNumber: input.referenceNumber?.trim() || null, paymentDate: input.paymentDate, notes: input.notes?.trim() || "" } });
    const invoiceState = await recalculateInvoice(tx, companyId, invoice.id);
    await recordEstimateEventInTransaction(tx,{companyId,estimateId:invoice.estimateId,eventType:"Payment Recorded",category:"Payment",actor:{type:"Employee",displayName:"Team member"},summary:`Team member recorded a $${input.amount.toFixed(2)} payment`,visibility:"Both",metadata:{invoiceId,paymentId:payment.id,amount:input.amount,method:input.method},attachments:[{referenceType:"Invoice",referenceId:invoice.id,displayName:invoice.displayNumber??"Invoice"}]});
    return { payment, invoiceState };
  });
  await syncPricingOutcomeForInvoice(companyId, invoiceId);
  return result;
}

export async function updatePayment(companyId: string, paymentId: string, input: UpdatePaymentInput) {
  validateAmount(input.amount);
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId, invoice: { companyId, customer: { companyId }, estimate: { companyId } } }, include: { invoice: { select: { id: true, total: true, status: true } } } });
    if (!payment) throw new Error("Payment not found.");
    if (payment.invoice.status === "Cancelled") throw new Error("Cancelled invoices cannot receive payments.");
    if (payment.invoice.status === "Void") throw new Error("Void invoices cannot receive payments.");
    const otherPayments = await tx.payment.aggregate({ where: { invoiceId: payment.invoiceId, companyId, invoice: { companyId }, id: { not: payment.id } }, _sum: { amount: true } });
    if ((otherPayments._sum.amount ?? 0) + input.amount > payment.invoice.total + 0.00001) throw new Error("Payment cannot exceed the invoice total.");
    const updated = await tx.payment.update({ where: { id: payment.id }, data: { amount: input.amount, method: input.method, referenceNumber: input.referenceNumber?.trim() || null, paymentDate: input.paymentDate, notes: input.notes?.trim() || "" } });
    const invoiceState = await recalculateInvoice(tx, companyId, payment.invoiceId);
    return { payment: updated, invoiceState };
  });
  await syncPricingOutcomeForInvoice(companyId, result.payment.invoiceId);
  return result;
}

export async function deletePayment(companyId: string, paymentId: string) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId, invoice: { companyId, customer: { companyId }, estimate: { companyId } } }, select: { id: true, invoiceId: true } });
    if (!payment) throw new Error("Payment not found.");
    const refunds = await tx.refund.count({ where: { companyId, paymentId: payment.id } });
    if (refunds > 0) throw new Error("Payments with durable refunds cannot be deleted.");
    await tx.payment.delete({ where: { id: payment.id } });
    const invoiceState = await recalculateInvoice(tx, companyId, payment.invoiceId);
    return { invoiceState, invoiceId: payment.invoiceId };
  });
  await syncPricingOutcomeForInvoice(companyId, result.invoiceId);
  return { invoiceState: result.invoiceState };
}
