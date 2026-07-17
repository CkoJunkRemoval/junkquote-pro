export type InvoiceWorkflowStatus = "Draft" | "Sent" | "Partial" | "Paid" | "Overdue" | "Cancelled";

export const invoiceStatusTransitions: Record<InvoiceWorkflowStatus, InvoiceWorkflowStatus[]> = {
  Draft: ["Sent", "Cancelled"],
  Sent: ["Partial", "Paid", "Overdue", "Cancelled"],
  Partial: ["Paid", "Overdue", "Cancelled"],
  Paid: [],
  Overdue: ["Partial", "Paid", "Cancelled"],
  Cancelled: [],
};

export function canTransitionInvoiceStatus(current: InvoiceWorkflowStatus, next: InvoiceWorkflowStatus) {
  return current === next || invoiceStatusTransitions[current].includes(next);
}
