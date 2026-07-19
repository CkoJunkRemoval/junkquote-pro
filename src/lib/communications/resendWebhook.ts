import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "@/lib/errors/appError";
export type ResendWebhookHeaders = {
  id: string | null;
  timestamp: string | null;
  signature: string | null;
};
export function verifyResendWebhook(
  body: string,
  headers: ResendWebhookHeaders,
  secret: string,
  now = Date.now(),
) {
  if (!headers.id || !headers.timestamp || !headers.signature)
    throw new AppError("FORBIDDEN", "Invalid webhook signature.");
  const seconds = Number(headers.timestamp);
  if (!Number.isFinite(seconds) || Math.abs(now - seconds * 1000) > 5 * 60_000)
    throw new AppError("FORBIDDEN", "Stale webhook event.");
  const key = Buffer.from(
    secret.startsWith("whsec_") ? secret.slice(6) : secret,
    "base64",
  );
  const expected = createHmac("sha256", key)
    .update(`${headers.id}.${headers.timestamp}.${body}`)
    .digest();
  const candidates = headers.signature.split(" ").flatMap((value) => {
    const [, encoded] = value.split(",");
    if (!encoded) return [];
    try {
      return [Buffer.from(encoded, "base64")];
    } catch {
      return [];
    }
  });
  if (
    !candidates.some(
      (value) =>
        value.length === expected.length && timingSafeEqual(value, expected),
    )
  )
    throw new AppError("FORBIDDEN", "Invalid webhook signature.");
  return headers.id;
}
export function parseResendDeliveryEvent(body: string) {
  let value: unknown;
  try {
    value = JSON.parse(body);
  } catch {
    throw new AppError("VALIDATION_FAILED", "Invalid webhook payload.");
  }
  if (!value || typeof value !== "object")
    throw new AppError("VALIDATION_FAILED", "Invalid webhook payload.");
  const event = value as {
    type?: unknown;
    created_at?: unknown;
    data?: { email_id?: unknown };
  };
  if (
    typeof event.type !== "string" ||
    typeof event.created_at !== "string" ||
    typeof event.data?.email_id !== "string"
  )
    throw new AppError("VALIDATION_FAILED", "Invalid webhook payload.");
  const occurredAt = new Date(event.created_at);
  if (Number.isNaN(occurredAt.getTime()))
    throw new AppError("VALIDATION_FAILED", "Invalid webhook timestamp.");
  return {
    eventType: event.type,
    providerMessageId: event.data.email_id,
    occurredAt,
  };
}
