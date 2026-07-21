"use server";
import { headers } from "next/headers";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { updateDraftInvoice, type UpdateDraftInvoiceInput } from "@/lib/invoices/updateDraftInvoice";
import { sendInvoice } from "@/lib/invoices/sendInvoice";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";

export async function updateDraftInvoiceAction(invoiceId: string, input: UpdateDraftInvoiceInput) {
  const c = await requireOperationalTenant();
  const result = await updateDraftInvoice(c.companyId, invoiceId, input);
  await recordAuditEvent({ companyId: c.companyId, actingUserId: c.user.id, eventType: "invoice.updated", entityType: "Invoice", entityId: invoiceId, requestId: await currentRequestId(), metadata: { total: result.total } });
  return result;
}
export async function sendInvoiceAction(invoiceId: string) {
  const c = await requireOperationalTenant(); const h = await headers(); const origin = h.get("origin") ?? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("x-forwarded-host") ?? h.get("host")}`;
  const result = await sendInvoice(c.companyId, invoiceId, origin, c.user.id);
  await recordAuditEvent({ companyId: c.companyId, actingUserId: c.user.id, eventType: "invoice.sent", entityType: "Invoice", entityId: invoiceId, requestId: await currentRequestId(), metadata: { to: result.invoice.lastSentTo } });
  return result.invoice;
}
