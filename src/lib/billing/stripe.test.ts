import { describe, expect, it, vi } from "vitest";
import Stripe from "stripe";

vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_example");
vi.stubEnv("STRIPE_WEBHOOK_SECRET", "whsec_test");
vi.stubEnv("STRIPE_PRICE_STARTER", "price_1");
vi.stubEnv("STRIPE_PRICE_PROFESSIONAL", "price_2");
vi.stubEnv("STRIPE_PRICE_BUSINESS", "price_3");

import { getStripe, requireStripeWebhookSecret } from "./stripe";

describe("Stripe signature verification", () => {
  it("rejects an invalid webhook signature", () =>
    expect(() =>
      getStripe().webhooks.constructEvent(
        "{}",
        "invalid",
        requireStripeWebhookSecret(),
      ),
    ).toThrow());
  it("accepts a correctly signed test payload", () => {
    const payload = JSON.stringify({
      id: "evt_1",
      object: "event",
      type: "invoice.paid",
      data: { object: {} },
    });
    const header = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: "whsec_test",
    });
    expect(
      getStripe().webhooks.constructEvent(payload, header, "whsec_test").id,
    ).toBe("evt_1");
  });
});
