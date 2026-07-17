"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { updateInvoiceStatus } from "@/lib/invoices/updateInvoiceStatus";
import type { InvoiceWorkflowStatus } from "@/lib/invoices/statusWorkflow";
export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceWorkflowStatus) { const { companyId } = await requireOperationalTenant(); return updateInvoiceStatus(companyId, invoiceId, status); }
