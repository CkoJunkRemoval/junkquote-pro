"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { createInvoice, type CreateInvoiceInput } from "@/lib/invoices/createInvoice";
export async function createInvoiceAction(input: CreateInvoiceInput) { const { companyId } = await requireOperationalTenant(); return createInvoice(companyId, input); }
