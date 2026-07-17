"use server";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
export async function getInvoiceDetailAction(invoiceId: string) { return getInvoiceDetail(invoiceId); }
