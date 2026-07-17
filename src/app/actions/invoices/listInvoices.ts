"use server";
import { listInvoices, type ListInvoicesInput } from "@/lib/invoices/listInvoices";
export async function listInvoicesAction(input: ListInvoicesInput = {}) { return listInvoices(input); }
