import { prisma } from "@/lib/prisma";
import { deriveInvoicePaymentState } from "./paymentRecalculation";
import { syncPricingOutcomeForInvoice } from "@/lib/smartPricing/outcomes";
import { recordEstimateEventInTransaction } from "@/lib/estimates/estimateEvents";

export interface RecordRefundInput { amount: number; reason?: string; externalReference?: string; refundedAt: Date; createdByUserId: string }
export async function recordRefund(companyId: string, paymentId: string, input: RecordRefundInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error("Refund amount must be positive.");
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: paymentId, companyId, invoice: { companyId } }, include: { invoice: { select: { id: true, total: true, dueDate: true, status: true, estimateId: true } } } });
    if (!payment) throw new Error("Payment not found.");
    if (payment.invoice.status === "Cancelled") throw new Error("Cancelled invoices cannot be refunded.");
    const user = await tx.user.findFirst({ where: { id: input.createdByUserId, companyId, memberships: { some: { companyId, status: "Active" } } }, select: { id: true } });
    if (!user) throw new Error("Refund user not found.");
    const existing = await tx.refund.aggregate({ where: { companyId, paymentId: payment.id, invoiceId: payment.invoiceId }, _sum: { amount: true } });
    if ((existing._sum.amount ?? 0) + input.amount > payment.amount + 0.00001) throw new Error("Cumulative refunds cannot exceed the payment amount.");
    const refund = await tx.refund.create({ data: { companyId, paymentId: payment.id, invoiceId: payment.invoiceId, amount: input.amount, reason: input.reason?.trim() || null, externalReference: input.externalReference?.trim() || null, refundedAt: input.refundedAt, createdByUserId: user.id } });
    const [payments, refunds] = await Promise.all([tx.payment.aggregate({ where: { companyId, invoiceId: payment.invoiceId }, _sum: { amount: true } }), tx.refund.aggregate({ where: { companyId, invoiceId: payment.invoiceId }, _sum: { amount: true } })]);
    const state = deriveInvoicePaymentState(payment.invoice.total, (payments._sum.amount ?? 0) - (refunds._sum.amount ?? 0), payment.invoice.dueDate);
    await tx.invoice.update({ where: { id: payment.invoiceId }, data: state });
    await recordEstimateEventInTransaction(tx,{companyId,estimateId:payment.invoice.estimateId,eventType:"Payment Recorded",category:"Payment",actor:{type:"Employee",id:user.id,userId:user.id,displayName:"Team member"},summary:`Refund of $${input.amount.toFixed(2)} recorded.`,visibility:"Both",metadata:{paymentId:payment.id,refundId:refund.id,amount:input.amount,reason:input.reason}});
    return { refund, invoiceState: state };
  });
  await syncPricingOutcomeForInvoice(companyId, result.refund.invoiceId);
  return result;
}
export async function listRefunds(companyId: string, paymentId: string) { const payment = await prisma.payment.findFirst({ where: { id: paymentId, companyId, invoice: { companyId } }, select: { id: true } }); if (!payment) throw new Error("Payment not found."); return prisma.refund.findMany({ where: { companyId, paymentId: payment.id, invoice: { companyId } }, orderBy: { refundedAt: "desc" } }); }
export async function getRefund(companyId: string, refundId: string) { const refund = await prisma.refund.findFirst({ where: { id: refundId, companyId, payment: { companyId }, invoice: { companyId } } }); if (!refund) throw new Error("Refund not found."); return refund; }
export async function deleteRefund(companyId: string, refundId: string) {
  const result = await prisma.$transaction(async (tx) => { const refund = await tx.refund.findFirst({ where: { id: refundId, companyId, payment: { companyId }, invoice: { companyId } }, include: { invoice: { select: { total: true, dueDate: true } } } }); if (!refund) throw new Error("Refund not found."); await tx.refund.delete({ where: { id: refund.id } }); const [payments, refunds] = await Promise.all([tx.payment.aggregate({ where: { companyId, invoiceId: refund.invoiceId }, _sum: { amount: true } }), tx.refund.aggregate({ where: { companyId, invoiceId: refund.invoiceId }, _sum: { amount: true } })]); const state = deriveInvoicePaymentState(refund.invoice.total, (payments._sum.amount ?? 0) - (refunds._sum.amount ?? 0), refund.invoice.dueDate); await tx.invoice.update({ where: { id: refund.invoiceId }, data: state }); return { refund, invoiceState: state }; }); await syncPricingOutcomeForInvoice(companyId, result.refund.invoiceId); return result;
}
