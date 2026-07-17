"use server";
import { updateInvoiceStatus } from "@/lib/invoices/updateInvoiceStatus";
import type { InvoiceWorkflowStatus } from "@/lib/invoices/statusWorkflow";
export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceWorkflowStatus) { return updateInvoiceStatus(invoiceId, status); }
