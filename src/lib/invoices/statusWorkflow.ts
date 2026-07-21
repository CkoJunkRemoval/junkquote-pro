export type InvoiceWorkflowStatus = "Draft" | "Sent" | "Viewed" | "Partial" | "Paid" | "Overdue" | "Void" | "Cancelled";

export const invoiceStatusTransitions: Record<InvoiceWorkflowStatus, InvoiceWorkflowStatus[]> = {
  Draft: ["Sent", "Void"],
  Sent: ["Viewed", "Partial", "Paid", "Overdue", "Void"],
  Viewed: ["Partial", "Paid", "Overdue", "Void"],
  Partial: ["Paid", "Overdue", "Void"],
  Paid: [],
  Overdue: ["Partial", "Paid", "Void"],
  Void: [],
  Cancelled: [],
};

export function canTransitionInvoiceStatus(current: InvoiceWorkflowStatus, next: InvoiceWorkflowStatus) {
  return current === next || invoiceStatusTransitions[current].includes(next);
}
