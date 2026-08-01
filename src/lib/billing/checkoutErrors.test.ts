import { describe, expect, it } from "vitest";
import Stripe from "stripe";
import { billingCheckoutFailure } from "./checkoutErrors";

describe("billingCheckoutFailure", () => {
  it("converts Stripe authentication failures to a controlled message without leaking the key", () => {
    const secretFragment = "sk_live_sensitive_fragment";
    const error = new Stripe.errors.StripeAuthenticationError({
      message: `Invalid API Key provided: ${secretFragment}`,
      type: "invalid_request_error",
    });
    const failure = billingCheckoutFailure(error);

    expect(failure).toMatchObject({
      category: "authentication",
      stripeType: "StripeAuthenticationError",
    });
    expect(JSON.stringify(failure)).not.toContain(secretFragment);
    expect(failure.message).toContain("not charged");
  });
});
