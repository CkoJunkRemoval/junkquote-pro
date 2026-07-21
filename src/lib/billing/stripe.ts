import Stripe from"stripe";
let client:Stripe|undefined;export function getStripe(){const key=process.env.STRIPE_SECRET_KEY;if(!key)throw new Error("STRIPE_SECRET_KEY is not configured.");return client??=new Stripe(key,{maxNetworkRetries:2});}
export function requireStripeWebhookSecret(){const value=process.env.STRIPE_WEBHOOK_SECRET;if(!value)throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");return value;}
