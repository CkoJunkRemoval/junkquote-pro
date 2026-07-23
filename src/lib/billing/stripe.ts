import Stripe from "stripe";
export class BillingUnavailableError extends Error {
  constructor() {
    super(
      "Billing is unavailable because Stripe is not configured for this deployment.",
    );
    this.name = "BillingUnavailableError";
  }
}
export function isBillingAvailable(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(
    env.STRIPE_SECRET_KEY?.trim() &&
      env.STRIPE_WEBHOOK_SECRET?.trim() &&
      env.STRIPE_PRICE_STARTER?.trim() &&
      env.STRIPE_PRICE_PROFESSIONAL?.trim() &&
      env.STRIPE_PRICE_BUSINESS?.trim(),
  );
}
let client: Stripe | undefined;
export function getStripe() {
  if (!isBillingAvailable()) throw new BillingUnavailableError();
  return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, {
    maxNetworkRetries: 2,
  }));
}
export function requireStripeWebhookSecret() {
  if (!isBillingAvailable()) throw new BillingUnavailableError();
  return process.env.STRIPE_WEBHOOK_SECRET!;
}
