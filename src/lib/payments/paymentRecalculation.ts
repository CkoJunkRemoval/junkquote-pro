import type { InvoiceWorkflowStatus } from "@/lib/invoices/statusWorkflow";

export function deriveInvoicePaymentState(total: number, amountPaid: number, dueDate: Date | null, now = new Date()) {
  const balanceDue = Math.max(0, total - amountPaid);
  const status: InvoiceWorkflowStatus = balanceDue === 0
    ? "Paid"
    : amountPaid > 0
      ? "Partial"
      : dueDate && dueDate < now
        ? "Overdue"
        : "Sent";
  return { balanceDue, status, paidDate: status === "Paid" ? now : null };
}
