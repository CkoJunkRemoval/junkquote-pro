"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
export async function getInvoiceDetailAction(invoiceId: string) { const { companyId } = await requireOperationalTenant(); return getInvoiceDetail(companyId, invoiceId); }
