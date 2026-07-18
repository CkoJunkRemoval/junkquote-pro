"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { deletePayment, recordPayment, updatePayment, type PaymentInput, type UpdatePaymentInput } from "@/lib/payments/paymentMutations";
import { listInvoicePayments } from "@/lib/payments/listInvoicePayments";
import { recordRefund, listRefunds, getRefund, deleteRefund, type RecordRefundInput } from "@/lib/payments/refunds";
async function authorizedContext() { return requireOperationalTenant(); }
async function authorizedCompanyId() { return (await authorizedContext()).companyId; }
export async function addPaymentAction(invoiceId: string, input: PaymentInput) { return recordPayment(await authorizedCompanyId(), invoiceId, input); }
export async function updatePaymentAction(paymentId: string, input: UpdatePaymentInput) { return updatePayment(await authorizedCompanyId(), paymentId, input); }
export async function deletePaymentAction(paymentId: string) { return deletePayment(await authorizedCompanyId(), paymentId); }
export async function refundPaymentAction(paymentId: string, input: Omit<RecordRefundInput, "createdByUserId">) { const context = await authorizedContext(); return recordRefund(context.companyId, paymentId, { ...input, createdByUserId: context.user.id }); }
export async function listRefundsAction(paymentId: string) { return listRefunds(await authorizedCompanyId(), paymentId); }
export async function getRefundAction(refundId: string) { return getRefund(await authorizedCompanyId(), refundId); }
export async function deleteRefundAction(refundId: string) { return deleteRefund(await authorizedCompanyId(), refundId); }
export async function listInvoicePaymentsAction(invoiceId: string) { return listInvoicePayments(await authorizedCompanyId(), invoiceId); }
