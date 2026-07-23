import type {
  InvoiceListPeriod,
  InvoiceListStatus,
} from "@/lib/invoices/listInvoices";

export type InvoiceManagementStatus = "All" | InvoiceListStatus;

export const invoiceManagementStatuses: readonly InvoiceManagementStatus[] = [
  "All",
  "Outstanding",
  "Draft",
  "Sent",
  "Partial",
  "Paid",
  "Overdue",
  "Cancelled",
];

export function parseInvoiceManagementStatus(
  raw: string | null | undefined,
): InvoiceManagementStatus {
  return invoiceManagementStatuses.includes(raw as InvoiceManagementStatus)
    ? (raw as InvoiceManagementStatus)
    : "All";
}

export function parseInvoiceManagementPeriod(
  raw: string | null | undefined,
): InvoiceListPeriod | undefined {
  return raw === "ThisMonth" ? "ThisMonth" : undefined;
}
