import { NextResponse } from "next/server";
import { BillingUnavailableError, getStripeConnect, requireStripeConnectWebhookSecret } from "@/lib/billing/stripe";
import { processStripeConnectEvent } from "@/lib/payments/stripeConnectWebhook";
import { withDistributedLock } from "@/lib/distributed/locks";

export async function POST(request: Request) {
  try {
    const signature = request.headers.get("stripe-signature");
    if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
    const event = getStripeConnect().webhooks.constructEvent(await request.text(), signature, requireStripeConnectWebhookSecret());
    const result = await withDistributedLock("stripe-connect-webhook", event.id, 5 * 60_000, () => processStripeConnectEvent(event));
    return NextResponse.json({ received: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof BillingUnavailableError) return NextResponse.json({ error: error.message }, { status: 503 });
    console.error("[stripe-connect-webhook] processing failed", { name: error instanceof Error ? error.name : "Unknown" });
    return NextResponse.json({ error: "Invalid or unprocessable Stripe Connect webhook." }, { status: 400 });
  }
}
