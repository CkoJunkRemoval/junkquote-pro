"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { deletePayment, recordPayment, updatePayment, type PaymentInput, type UpdatePaymentInput } from "@/lib/payments/paymentMutations";
import { listInvoicePayments } from "@/lib/payments/listInvoicePayments";
async function authorizedCompanyId() { return (await requireOperationalTenant()).companyId; }
export async function addPaymentAction(invoiceId: string, input: PaymentInput) { return recordPayment(await authorizedCompanyId(), invoiceId, input); }
export async function updatePaymentAction(paymentId: string, input: UpdatePaymentInput) { return updatePayment(await authorizedCompanyId(), paymentId, input); }
export async function deletePaymentAction(paymentId: string) { return deletePayment(await authorizedCompanyId(), paymentId); }
export async function refundPaymentAction(paymentId: string) { return deletePayment(await authorizedCompanyId(), paymentId); }
export async function listInvoicePaymentsAction(invoiceId: string) { return listInvoicePayments(await authorizedCompanyId(), invoiceId); }
