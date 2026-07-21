"use server";
import { randomUUID } from "node:crypto";
import { requireAdminTenant } from "@/lib/auth/tenant";
import { selectCommunicationProvider } from "@/lib/communications/provider";
import {
  beginDelivery,
  markDeliveryFailed,
  markDeliverySent,
} from "@/lib/communications/delivery";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { AppError } from "@/lib/errors/appError";
import { currentRequestId } from "@/lib/audit/requestAudit";
import { recordAuditEvent } from "@/lib/audit/audit";
export async function sendEmailDiagnosticAction(to: string) {
  const c = await requireAdminTenant();
  if (!/^\S+@\S+\.\S+$/.test(to.trim()))
    throw new AppError(
      "VALIDATION_FAILED",
      "Enter a valid diagnostic email address.",
    );
  if (
    !(await checkRateLimit(`email-diagnostic:${c.companyId}:${c.user.id}`, {
      limit: 3,
      windowMs: 60 * 60_000,
    })).allowed
  )
    throw new AppError("RATE_LIMITED", "Too many diagnostic requests.");
  const requestId = await currentRequestId();
  const provider = selectCommunicationProvider();
  const idempotencyKey = `diagnostic:${c.companyId}:${randomUUID()}`;
  const message = {
    channel: "email" as const,
    to: to.trim(),
    subject: "JunkQuote Pro production email diagnostic",
    body: "This transactional test confirms that JunkQuote Pro production email delivery is configured.",
  };
  const delivery = await beginDelivery({
    companyId: c.companyId,
    idempotencyKey,
    provider: provider.name ?? "custom",
    message,
    requestId,
  });
  try {
    const result = await provider.send(message, {
      idempotencyKey,
      requestId,
      communicationId: delivery.id,
    });
    await markDeliverySent(delivery.id, result.providerMessageId);
    await recordAuditEvent({
      companyId: c.companyId,
      actingUserId: c.user.id,
      eventType: "email.diagnostic_sent",
      entityType: "CommunicationDelivery",
      entityId: delivery.id,
      requestId,
      metadata: { provider: provider.name },
    });
    return { success: true, requestId, deliveryId: delivery.id };
  } catch (error) {
    await markDeliveryFailed(delivery.id, error);
    await recordAuditEvent({
      companyId: c.companyId,
      actingUserId: c.user.id,
      eventType: "email.diagnostic_failed",
      entityType: "CommunicationDelivery",
      entityId: delivery.id,
      requestId,
      metadata: { provider: provider.name },
    });
    throw error;
  }
}
