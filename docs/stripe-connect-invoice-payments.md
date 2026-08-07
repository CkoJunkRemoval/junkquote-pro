# Stripe Connect invoice payments

JunkQuote Pro uses two deliberately separate Stripe flows. The existing `/api/webhooks/stripe` endpoint and Stripe Billing customer/subscription records represent a company paying CKO Digital LLC for the SaaS product. Customer invoice revenue uses Stripe Connect direct charges and never uses that subscription Customer.

## Architecture

Each `Company` may map to one Stripe connected account. The integration uses Accounts v1 controller fields supported by the installed Stripe SDK, Stripe-hosted requirement collection, full Stripe Dashboard access, and direct charges. Stripe is responsible for onboarding, verification, fees, and payment losses. JunkQuote Pro adds no application fee. Only Owner/Admin roles can create, resume, disconnect, or view connection management.

Account state is synchronized from Stripe. `details_submitted` alone is insufficient: online payments require a paid/trial entitlement, no internal disconnect, `CONNECTED`, charges enabled, and payouts enabled. Disconnect is internal and reversible; it preserves mapping and payment history.

The customer portal displays the authoritative invoice balance and creates Checkout only after a signed-in portal customer submits Pay Securely. The server rechecks company/customer/invoice scope, status, balance, entitlement, and connected-account state. Checkout is created with `stripeAccount`, so the charge belongs directly to the company. The success redirect only displays “Payment received — confirming.” The separate `/api/webhooks/stripe-connect` endpoint verifies its own signature and is authoritative for payment, failure, refund, dispute, invoice-balance, and account-state reconciliation. Connected account mapping comes from `event.account`, never client metadata.

Refund initiation remains in the connected company’s Stripe Dashboard. Signed Connect refund events preserve the original Payment, create durable Refund history, and reopen the invoice balance when appropriate.

## Environment and Stripe Dashboard checklist

- Use test-mode `STRIPE_SECRET_KEY` with test connected accounts locally/Preview; use a live key and live accounts only in Production.
- Set `NEXT_PUBLIC_APP_URL` to the deployment origin. Production must be HTTPS; localhost HTTP is accepted during development.
- Keep the existing subscription webhook registered at `/api/webhooks/stripe` with `STRIPE_WEBHOOK_SECRET`.
- Register a Connect webhook at `/api/webhooks/stripe-connect`, enable events on connected accounts, and subscribe to `account.updated`, `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`, `charge.dispute.created`, and `charge.dispute.closed`.
- Store that endpoint’s distinct signing secret as `STRIPE_CONNECT_WEBHOOK_SECRET` in Preview and Production.
- Configure Connect platform branding, support details, onboarding options, and redirect domains in Stripe Dashboard.
- Confirm card payments and payouts are available in every supported country before expanding beyond the current US account default.

Troubleshooting: verify key mode matches the connected account, inspect the safe Payments status (not raw IDs), confirm webhook delivery targets the Connect endpoint, and retry onboarding through Finish setup to generate a fresh single-use Account Link. Never copy Account Links into email or support messages.
