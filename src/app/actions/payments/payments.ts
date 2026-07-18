"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import {
  deletePayment,
  recordPayment,
  updatePayment,
  type PaymentInput,
  type UpdatePaymentInput,
} from "@/lib/payments/paymentMutations";
import { listInvoicePayments } from "@/lib/payments/listInvoicePayments";
import {
  recordRefund,
  listRefunds,
  getRefund,
  deleteRefund,
  type RecordRefundInput,
} from "@/lib/payments/refunds";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
async function authorizedContext() {
  return requireOperationalTenant();
}
async function authorizedCompanyId() {
  return (await authorizedContext()).companyId;
}
export async function addPaymentAction(invoiceId: string, input: PaymentInput) {
  const c = await authorizedContext();
  const result = await recordPayment(c.companyId, invoiceId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "payment.created",
    entityType: "Payment",
    entityId: result.payment.id,
    requestId: await currentRequestId(),
    metadata: { invoiceId, amount: input.amount, method: input.method },
  });
  return result;
}
export async function updatePaymentAction(
  paymentId: string,
  input: UpdatePaymentInput,
) {
  const c = await authorizedContext();
  const result = await updatePayment(c.companyId, paymentId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "payment.updated",
    entityType: "Payment",
    entityId: paymentId,
    requestId: await currentRequestId(),
    metadata: { amount: input.amount, method: input.method },
  });
  return result;
}
export async function deletePaymentAction(paymentId: string) {
  const c = await authorizedContext();
  const result = await deletePayment(c.companyId, paymentId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "payment.deleted",
    entityType: "Payment",
    entityId: paymentId,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function refundPaymentAction(
  paymentId: string,
  input: Omit<RecordRefundInput, "createdByUserId">,
) {
  const context = await authorizedContext();
  const result = await recordRefund(context.companyId, paymentId, {
    ...input,
    createdByUserId: context.user.id,
  });
  await recordAuditEvent({
    companyId: context.companyId,
    actingUserId: context.user.id,
    eventType: "refund.created",
    entityType: "Refund",
    entityId: result.refund.id,
    requestId: await currentRequestId(),
    metadata: { paymentId, amount: input.amount },
  });
  return result;
}
export async function listRefundsAction(paymentId: string) {
  return listRefunds(await authorizedCompanyId(), paymentId);
}
export async function getRefundAction(refundId: string) {
  return getRefund(await authorizedCompanyId(), refundId);
}
export async function deleteRefundAction(refundId: string) {
  const c = await authorizedContext();
  const result = await deleteRefund(c.companyId, refundId);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "refund.deleted",
    entityType: "Refund",
    entityId: refundId,
    requestId: await currentRequestId(),
  });
  return result;
}
export async function listInvoicePaymentsAction(invoiceId: string) {
  return listInvoicePayments(await authorizedCompanyId(), invoiceId);
}
