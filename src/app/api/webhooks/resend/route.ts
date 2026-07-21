import { safeErrorResponse, AppError } from "@/lib/errors/appError";
import { createRequestId } from "@/lib/observability/requestId";
import {
  verifyResendWebhook,
  parseResendDeliveryEvent,
} from "@/lib/communications/resendWebhook";
import { applyDeliveryWebhook } from "@/lib/communications/delivery";
import { checkRateLimit } from "@/lib/security/rateLimit";
import { withDistributedLock } from "@/lib/distributed/locks";
export const runtime = "nodejs";
const maxBytes = 256 * 1024;
export async function POST(request: Request) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  try {
    const identity =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const rateLimit = await checkRateLimit(`resend-webhook:${identity}`, {
        limit: 120,
        windowMs: 60_000,
      });
    if (!rateLimit.allowed)
      throw new AppError("RATE_LIMITED", "Too many webhook requests.", { retryAfterSeconds: rateLimit.retryAfterSeconds });
    const length = Number(request.headers.get("content-length") ?? 0);
    if (length > maxBytes)
      throw new AppError("VALIDATION_FAILED", "Webhook payload is too large.");
    const body = await request.text();
    if (Buffer.byteLength(body) > maxBytes)
      throw new AppError("VALIDATION_FAILED", "Webhook payload is too large.");
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    if (!secret)
      throw new AppError(
        "PROVIDER_FAILED",
        "Webhook configuration is unavailable.",
      );
    const providerEventId = verifyResendWebhook(
      body,
      {
        id: request.headers.get("svix-id"),
        timestamp: request.headers.get("svix-timestamp"),
        signature: request.headers.get("svix-signature"),
      },
      secret,
    );
    const event = parseResendDeliveryEvent(body);
    const result = await withDistributedLock("resend-webhook", providerEventId, 5 * 60_000, () => applyDeliveryWebhook({ providerEventId, ...event }));
    return Response.json(
      { received: true, duplicate: result.duplicate, requestId },
      { headers: { "x-request-id": requestId } },
    );
  } catch (error) {
    return safeErrorResponse(error, requestId);
  }
}
