type PayableInvoice = { id: string; balanceDue: number; status: string };

export function customerInvoicePaymentUrl(origin: string, invoice: PayableInvoice) {
  if (invoice.balanceDue <= 0 || ["Paid", "Void", "Cancelled"].includes(invoice.status)) return null;
  return new URL(`/portal/invoices/${encodeURIComponent(invoice.id)}`, new URL(origin).origin).toString();
}
