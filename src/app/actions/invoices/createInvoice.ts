"use server";
import { requireOperationalTenant } from "@/lib/auth/tenant";
import {
  createInvoice,
  type CreateInvoiceInput,
} from "@/lib/invoices/createInvoice";
import { recordAuditEvent } from "@/lib/audit/audit";
import { currentRequestId } from "@/lib/audit/requestAudit";
export async function createInvoiceAction(input: CreateInvoiceInput) {
  const c = await requireOperationalTenant();
  const result = await createInvoice(c.companyId, input);
  await recordAuditEvent({
    companyId: c.companyId,
    actingUserId: c.user.id,
    eventType: "invoice.created",
    entityType: "Invoice",
    entityId: result.id,
    requestId: await currentRequestId(),
  });
  return result;
}
