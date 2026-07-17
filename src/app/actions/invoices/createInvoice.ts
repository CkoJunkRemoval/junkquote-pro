"use server";
import { createInvoice, type CreateInvoiceInput } from "@/lib/invoices/createInvoice";
export async function createInvoiceAction(input: CreateInvoiceInput) { return createInvoice(input); }
