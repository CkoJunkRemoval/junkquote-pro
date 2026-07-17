"use server";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { renderInvoicePdf } from "@/data/output/renderInvoicePdf";

export async function downloadInvoicePdfAction(invoiceId: string) {
  const invoice = await getInvoiceDetail(invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  return renderInvoicePdf(invoice);
}
