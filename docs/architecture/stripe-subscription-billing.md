# Stripe subscription billing and internal trials

## Sources of truth

`CompanySubscription` belongs to `Company`. Users and memberships never own a Stripe Customer or subscription. The central resolver applies this order on every access check: a qualifying paid Stripe state with successful-payment evidence, an active timestamped internal trial, then Free. The internal 30-day Professional trial is not a Stripe trial and creates no Stripe object at signup. An expired or converted trial never resumes.

New companies receive one UTC 30-calendar-day Professional trial. Existing companies are not granted a new trial by this migration: valid legacy trials remain consumable and other existing records are marked ineligible. Expiration preserves every business record and changes effective access to Free without relying on a scheduler.

Free includes one active company user and six estimates per UTC calendar month. Counts use tenant-scoped immutable creation-ledger rows sourced from authoritative `Estimate.createdAt` timestamps in `[month start, next month start)`. Revisions count and deleting an estimate does not restore allowance. Paid-module routes and their existing mutations use the shared entitlement layer; Billing remains available to Owners/Admins.

## Stripe catalog and lifecycle

The server-only catalog maps Starter, Professional, and Enterprise monthly/yearly selections to six environment Price IDs. Clients submit only plan and interval; arbitrary Price IDs fail closed. Checkout uses quantity one, company metadata, a company-owned Customer, idempotency keys, safe application-origin URLs, and duplicate-subscription protection. Redirect success never provisions access.

The raw-body `/api/webhooks/stripe` endpoint verifies `STRIPE_WEBHOOK_SECRET`, locks and deduplicates event IDs, ignores unsupported signed events, rejects unknown prices, and synchronizes checkout completion, subscription create/update/delete, invoice paid/payment failed, and customer updates. Event creation timestamps prevent older subscription events overwriting newer state. `Active` needs successful invoice evidence; `PastDue` keeps access only through the configured grace deadline; `Unpaid`, `Canceled`, `Incomplete`, `IncompleteExpired`, and `Paused` do not grant paid access. Cancellation is expected to be configured at period end in Stripe Customer Portal. Portal plan changes and prorations follow the Stripe Dashboard portal configuration and become effective only after webhook synchronization.

## Operations checklist

1. Add `STRIPE_WEBHOOK_SECRET` in Preview and register the Preview `/api/webhooks/stripe` endpoint.
2. Select `checkout.session.completed`, subscription create/update/delete, `invoice.paid`, `invoice.payment_failed`, and `customer.updated`.
3. Configure Customer Portal payment methods, invoice history, cancellation at period end, allowed products/prices, downgrade timing, and proration policy.
4. Add sandbox secret/publishable keys and all six sandbox Price IDs; run mocked tests and a Stripe CLI/Test Clock end-to-end check without a real charge.
5. Confirm or copy the catalog in live mode. Add live Production keys and six live Price IDs, then register the Production endpoint and signing secret.
6. Redeploy, perform a controlled low-dollar live subscription, confirm webhook plan synchronization, then refund/cancel it if appropriate.
7. Reconcile Stripe subscriptions against company subscription/history and audit rows. For rollback, disable checkout UI/config without deleting subscription data, retain webhook receipt, fix forward, and replay affected Stripe events.

Never log keys, signing secrets, payloads, card data, Customer IDs in customer-visible UI, or private company content. Preview may use test mode; Production validation rejects test secret keys and test Price IDs. Stripe Dashboard and Vercel configuration are manual deployment requirements.
