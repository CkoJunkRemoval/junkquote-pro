import { recordAuditEvent } from "@/lib/audit/audit";
import {
  BillingUnavailableError,
  getStripe,
  requireStripeWebhookSecret,
} from "@/lib/billing/stripe";
import { processStripeEvent } from "@/lib/billing/stripeLifecycle";
import { withDistributedLock } from "@/lib/distributed/locks";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    const limit = await checkRateLimit(
      `stripe-webhook:${ip}`,
      ratePolicies.webhook,
    );
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Too many requests." },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    const signature = request.headers.get("stripe-signature");
    if (!signature)
      return NextResponse.json(
        { error: "Missing Stripe signature." },
        { status: 400 },
      );
    const event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      requireStripeWebhookSecret(),
    );
    const result = await withDistributedLock(
      "stripe-webhook",
      event.id,
      5 * 60_000,
      () => processStripeEvent(event),
    );
    if (result.companyId)
      await recordAuditEvent({
        companyId: result.companyId,
        eventType:
          event.type === "invoice.payment_failed"
            ? "billing.payment_failed"
            : "billing.stripe_event",
        entityType: "Subscription",
        entityId: event.id,
        metadata: { type: event.type, duplicate: result.duplicate },
      });
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof BillingUnavailableError)
      return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("[stripe-webhook] processing failed", {
      name: error instanceof Error ? error.name : "Unknown",
    });
    return NextResponse.json(
      { error: "Invalid or unprocessable Stripe webhook." },
      { status: 400 },
    );
  }
}
