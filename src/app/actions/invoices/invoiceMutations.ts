"use server";
import { headers } from "next/headers";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { updateDraftInvoice, type UpdateDraftInvoiceInput } from "@/lib/invoices/updateDraftInvoice";
import { sendInvoice } from "@/lib/invoices/sendInvoice";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
import { getInvoiceDetail } from "@/lib/invoices/getInvoiceDetail";
import { customerInvoicePaymentUrl } from "@/lib/invoices/paymentLink";

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
export async function getInvoicePaymentLinkAction(invoiceId: string) {
  const context = await requireOperationalTenant();
  const invoice = await getInvoiceDetail(context.companyId, invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const origin = configured ? new URL(configured).origin : host ? new URL(`${requestHeaders.get("x-forwarded-proto") === "http" ? "http" : "https"}://${host}`).origin : null;
  const url = origin ? customerInvoicePaymentUrl(origin, invoice) : null;
  if (!url) throw new Error("A payable customer link is not available for this invoice.");
  return url;
}
