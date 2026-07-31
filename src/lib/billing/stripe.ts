import Stripe from "stripe";
import { priceIdFor } from "./config";

const stripeNames = ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET", "STRIPE_PRICE_STARTER_MONTHLY", "STRIPE_PRICE_STARTER_YEARLY", "STRIPE_PRICE_PROFESSIONAL_MONTHLY", "STRIPE_PRICE_PROFESSIONAL_YEARLY", "STRIPE_PRICE_ENTERPRISE_MONTHLY", "STRIPE_PRICE_ENTERPRISE_YEARLY"] as const;
export class BillingUnavailableError extends Error { constructor(message = "Billing is unavailable because Stripe is not configured for this deployment.") { super(message); this.name = "BillingUnavailableError"; } }
export function isBillingAvailable(env: NodeJS.ProcessEnv = process.env) { return stripeNames.every((name) => Boolean(env[name]?.trim())); }
export function assertBillingAvailable() { if (!isBillingAvailable()) throw new BillingUnavailableError(); }
let client: Stripe | undefined;
export function getStripe() { assertBillingAvailable(); return (client ??= new Stripe(process.env.STRIPE_SECRET_KEY!)); }
export function requireStripeWebhookSecret() { assertBillingAvailable(); return process.env.STRIPE_WEBHOOK_SECRET!; }
export function validateCheckoutSelection(plan: string, interval: string) {
  if (!["Starter", "Professional", "Enterprise"].includes(plan) || !["Monthly", "Yearly"].includes(interval)) throw new Error("Choose a supported plan and billing interval.");
  const priceId = priceIdFor(plan as "Starter" | "Professional" | "Enterprise", interval as "Monthly" | "Yearly");
  if (!priceId) throw new Error("The selected Stripe price is not configured.");
  return { plan: plan as "Starter" | "Professional" | "Enterprise", interval: interval as "Monthly" | "Yearly", priceId };
}
