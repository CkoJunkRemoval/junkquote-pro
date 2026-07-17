"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { getPaymentReceiptData } from "@/lib/payments/listInvoicePayments";
import { renderPaymentReceiptPdf } from "@/data/output/renderPaymentReceiptPdf";
export async function downloadPaymentReceiptAction(paymentId: string) { const { companyId } = await requireOperationalTenant(); const payment = await getPaymentReceiptData(companyId, paymentId); if (!payment) throw new Error("Payment not found."); return renderPaymentReceiptPdf(payment); }
