import { prisma } from "../prisma";

export type DraftInvoiceLineItem = { description: string; kind?: string; quantity: number; unitPrice: number };
export type UpdateDraftInvoiceInput = { lineItems: DraftInvoiceLineItem[]; discounts: number; tax: number; dueDate?: Date | null; notes?: string };

export async function updateDraftInvoice(companyId: string, invoiceId: string, input: UpdateDraftInvoiceInput) {
  if (!input.lineItems.length) throw new Error("An invoice must contain at least one line item.");
  for (const item of input.lineItems) if (!item.description.trim() || !Number.isFinite(item.quantity) || item.quantity <= 0 || !Number.isFinite(item.unitPrice)) throw new Error("Every line item needs a description, positive quantity, and valid price.");
  if (!Number.isFinite(input.discounts) || input.discounts < 0 || !Number.isFinite(input.tax) || input.tax < 0) throw new Error("Discounts and tax cannot be negative.");
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { id: true, status: true } });
    if (!invoice) throw new Error("Invoice not found.");
    if (invoice.status !== "Draft") throw new Error("Only draft invoices can be edited.");
    const rows = input.lineItems.map((item, sortOrder) => ({ invoiceId, description: item.description.trim(), kind: item.kind?.trim() || "Service", quantity: item.quantity, unitPrice: item.unitPrice, amount: Math.round(item.quantity * item.unitPrice * 100) / 100, sortOrder }));
    const subtotal = Math.round(rows.reduce((sum, item) => sum + item.amount, 0) * 100) / 100;
    const total = Math.max(0, Math.round((subtotal + input.tax - input.discounts) * 100) / 100);
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId } });
    await tx.invoiceLineItem.createMany({ data: rows });
    return tx.invoice.update({ where: { id: invoiceId }, data: { subtotal, tax: input.tax, discounts: input.discounts, total, balanceDue: total, dueDate: input.dueDate, notes: input.notes?.trim() ?? "" }, include: { lineItems: { orderBy: { sortOrder: "asc" } } } });
  });
}
