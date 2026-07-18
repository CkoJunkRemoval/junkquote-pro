"use server";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import{checkRateLimit,ratePolicies}from"@/lib/security/rateLimit";import{AppError}from"@/lib/errors/appError";

export async function downloadInvoicePdfAction(invoiceId: string) {
  const c = await requireOperationalTenant();if(!checkRateLimit(`pdf:${c.companyId}:${c.user.id}`,ratePolicies.pdf).allowed)throw new AppError("RATE_LIMITED","Too many PDF requests.");
  const invoice = await getInvoiceDetail(c.companyId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  return renderInvoicePdf(invoice);
}
