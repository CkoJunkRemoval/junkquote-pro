"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import { updateInvoiceStatus } from "@/lib/invoices/updateInvoiceStatus";
import type { InvoiceWorkflowStatus } from "@/lib/invoices/statusWorkflow";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
export async function updateInvoiceStatusAction(
  invoiceId: string,
  status: InvoiceWorkflowStatus,
) {
  const c = await requireOperationalTenant();
  const result = await updateInvoiceStatus(c.companyId, invoiceId, status);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "invoice.status_changed",
    entityType: "Invoice",
    entityId: invoiceId,
    requestId: await currentRequestId(),
    metadata: { status },
  });
  return result;
}
