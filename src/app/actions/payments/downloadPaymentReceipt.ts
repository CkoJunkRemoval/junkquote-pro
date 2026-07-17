"use server";
import { getPaymentReceiptData } from "@/lib/payments/listInvoicePayments";
import { renderPaymentReceiptPdf } from "@/data/output/renderPaymentReceiptPdf";
export async function downloadPaymentReceiptAction(paymentId: string) { const payment = await getPaymentReceiptData(paymentId); if (!payment) throw new Error("Payment not found."); return renderPaymentReceiptPdf(payment); }
