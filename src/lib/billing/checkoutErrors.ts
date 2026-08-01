import Stripe from "stripe";

export type BillingCheckoutFailure = {
  category: "authentication" | "configuration" | "stripe" | "application";
  statusCode: number | null;
  stripeType: string | null;
  stripeCode: string | null;
  message: string;
};

const checkoutMessage =
  "We couldn’t open secure checkout. Your account was not charged. Please try again or contact support.";

export function billingCheckoutFailure(error: unknown): BillingCheckoutFailure {
  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      category: "authentication",
      statusCode: error.statusCode ?? null,
      stripeType: error.type ?? null,
      stripeCode: error.code ?? null,
      message: checkoutMessage,
    };
  }
  if (error instanceof Stripe.errors.StripeError) {
    return {
      category: "stripe",
      statusCode: error.statusCode ?? null,
      stripeType: error.type ?? null,
      stripeCode: error.code ?? null,
      message: checkoutMessage,
    };
  }
  return {
    category: "application",
    statusCode: null,
    stripeType: null,
    stripeCode: null,
    message: checkoutMessage,
  };
}
