# First production release readiness

## Release scope

This release candidate freezes the existing CRM, estimates, dispatch, workforce,
time tracking, fleet, finance, tax, Company Hub, and customer portal workflows.
It does not add online customer payment processing, AI, new third-party
integrations, or subscription billing behavior.

## Production architecture

- Auth.js credentials authenticate staff. Every staff mutation resolves an
  active company membership on the server and applies role or capability checks.
- Customer portal access uses hashed, expiring, single-use magic-link tokens and
  hashed, expiring sessions. Portal queries require both company and customer
  ownership.
- PostgreSQL and the complete Prisma migration chain are authoritative for
  durable business state.
- Resend is the production email provider. Delivery state and verified webhook
  events are persisted. Console delivery is development-only.
- Supabase private storage is required in production. Private assets are served
  through authenticated, tenant-authorized application routes or short-lived
  signed access. Local private storage is development-only.
- Stripe is used only for JunkQuote Pro subscription lifecycle state. Customer
  invoice payments are manual ledger entries; online invoice checkout is not
  presented as available.

## Required environment

Production requires `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET` (or
`NEXTAUTH_SECRET`), `APP_URL`, and `BACKGROUND_JOB_TOKEN`.

Private storage requires:

- `PRIVATE_ASSET_STORAGE_DRIVER=supabase`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_PRIVATE_BUCKET`

Email requires `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, and `RESEND_WEBHOOK_SECRET`.

Subscription billing requires a live `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, and live Stripe price IDs for every enabled plan.
Test-mode Stripe keys and prices are rejected in production.

`DATABASE_URL` is the runtime pooled connection. `DIRECT_URL` is the direct
migration connection and must resolve to the same database name. Secrets must
remain in the deployment environment, never source control.

## Deployment and migration

1. Back up the production database and private bucket.
2. Verify all required environment variables using the readiness endpoint and
   production environment validator.
3. Run `prisma migrate deploy` with `DIRECT_URL`.
4. Generate the Prisma client and build the exact release revision.
5. Deploy, then check health/readiness, staff authentication, tenant selection,
   background jobs, Resend delivery, Stripe subscription webhook receipt, and
   private asset delivery.
6. Run the staff Company Hub and customer portal smoke reviews.

Never run reset, development migrations, fixtures, or integration tests against
development, preview, or production databases.

## Deterministic release scenarios

The automated unit and integration suites cover:

- A: customer/property/estimate persistence and tenant scoping.
- B: estimate send, customer-safe projection, revision freshness, approval,
  decline, expiration, and idempotent replay.
- C: approved estimate to job and schedule enforcement.
- D: portal jobs, reschedule requests, messages, and customer-visible photos.
- E: invoice creation, tenant-scoped numbering, manual payment ledger,
  refunds, receipts, and balances.
- F: queued communications, provider idempotency, delivery state, and verified
  webhook handling.
- G: private asset authorization and cross-tenant denial.
- H: subscription feature entitlements and usage limits.

The authenticated browser harness additionally exercises the portal dashboard,
estimate, job, invoice, payment, message, and service-plan routes at mobile,
desktop, and wide-desktop sizes.

## Security decisions

- Internal pricing-rule names, base prices, and price overrides are omitted from
  customer portal and customer PDF projections.
- Portal estimate acceptance records customer name, consent, timestamp, method,
  terms version, IP address, and user agent. Consent-only approval is rendered
  as text in PDFs rather than treated as an image.
- Portal estimate and invoice PDFs are generated on demand only after session,
  tenant, and customer authorization. Responses are rate-limited and
  `private, no-store`.
- Company document upload and listing remain intentionally disabled until
  secure authenticated delivery is complete. Stored object keys are not shown.
- Production refuses local private storage, local/development database targets,
  mismatched migration/runtime databases, and Stripe test credentials.

## Release blockers and known limitations

P1 launch blocker:

- Team invitations are preparation records only. They do not create an
  authenticated user or active company membership, and signup creates a new
  company. A secure invitation acceptance and account activation flow must be
  completed before self-service multi-user onboarding is advertised.

Known launch-safe limitations:

- Online customer invoice payment processing is intentionally unavailable.
- Company document upload/listing is intentionally unavailable.
- SMS and push delivery remain placeholders.
- Coverage maps and travel surcharge calculation remain future work.
- Subscription webhooks update subscription state; they do not process customer
  invoice payments.

## Rollback

If smoke checks fail, stop traffic to the new release, redeploy the previous
application revision, and retain the migrated database unless a reviewed,
forward-safe corrective migration is required. Do not manually delete migration
history. Restore the database or private bucket only for confirmed data
corruption and only from the deployment backup.

## Support checklist

- Confirm the affected company, user role, route, timestamp, and request ID.
- Check readiness, background job, email delivery, webhook, and audit records.
- Never request passwords, magic-link tokens, Stripe secrets, or storage keys.
- Revoke compromised portal access or staff membership before reissuing access.
- Verify tenant ownership before inspecting or returning any customer document.
- Escalate cross-tenant exposure, authentication bypass, data loss, or payment
  ledger corruption as P0.
