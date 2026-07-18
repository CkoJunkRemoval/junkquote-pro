"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { getPaymentReceiptData } from "@/lib/payments/listInvoicePayments";
import { renderPaymentReceiptPdf } from "@/data/output/renderPaymentReceiptPdf";
import{checkRateLimit,ratePolicies}from"@/lib/security/rateLimit";import{AppError}from"@/lib/errors/appError";export async function downloadPaymentReceiptAction(paymentId: string) { const c = await requireOperationalTenant();if(!checkRateLimit(`pdf:${c.companyId}:${c.user.id}`,ratePolicies.pdf).allowed)throw new AppError("RATE_LIMITED","Too many PDF requests.");const payment = await getPaymentReceiptData(c.companyId, paymentId); if (!payment) throw new Error("Payment not found."); return renderPaymentReceiptPdf(payment); }
