"use server";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";
import { requireOperationalTenant } from "@/lib/auth/tenant";

export async function downloadInvoicePdfAction(invoiceId: string) {
  const { companyId } = await requireOperationalTenant();
  const invoice = await getInvoiceDetail(companyId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  return renderInvoicePdf(invoice);
}
