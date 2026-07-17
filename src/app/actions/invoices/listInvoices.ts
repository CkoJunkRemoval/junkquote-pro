"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { listInvoices, type ListInvoicesInput } from "@/lib/invoices/listInvoices";
export async function listInvoicesAction(input: ListInvoicesInput = {}) { const { companyId } = await requireOperationalTenant(); return listInvoices(companyId, input); }
