"use server";
import { addPayment, deletePayment, updatePayment, type PaymentInput, type UpdatePaymentInput } from "@/lib/payments/paymentMutations";
import { listInvoicePayments } from "@/lib/payments/listInvoicePayments";
export async function addPaymentAction(input: PaymentInput) { return addPayment(input); }
export async function updatePaymentAction(input: UpdatePaymentInput) { return updatePayment(input); }
export async function deletePaymentAction(paymentId: string) { return deletePayment(paymentId); }
export async function listInvoicePaymentsAction(invoiceId: string) { return listInvoicePayments(invoiceId); }
