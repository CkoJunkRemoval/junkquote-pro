# Controlled single-instance beta deployment

## Supported profile

- Node.js 22 LTS, one long-running application process, one worker invocation at a time.
- Install: `npm ci`; generate: `npx prisma generate`; migrate: `npx prisma migrate deploy`; build: `npm run build`; start: `npm start`.
- Default port: `3000` through `PORT`; TLS terminates at a trusted reverse proxy which forwards HTTPS scheme and client IP headers.
- Health probes: `/api/health/live` and `/api/health/ready`.
- Private objects: private Supabase Storage bucket. No public bucket or service-role key is exposed to browsers.
- Transactional email: Resend with signed webhook delivery events at `/api/webhooks/resend`.
- Logs: collect stdout/stderr JSON centrally and retain request IDs. Never collect environment dumps.
- Writable directory: `.data` only for the single-worker lock and administrative reports. Production assets do not use it.
- Backup ownership must be assigned to a named operator before opening the gate.

Required variables are documented in `.env.example`. Production core requires `EMAIL_PROVIDER=resend`, `RESEND_API_KEY`, `RESEND_WEBHOOK_SECRET`, private storage provider credentials, HTTPS application/auth URLs, database credentials, a strong `AUTH_SECRET`, and `PLATFORM_ADMIN_EMAIL`. Stripe, Redis, push notifications, the worker toggle, and a custom CSP override are optional; disabled integrations are reported as warnings. The controlled beta profile should still enable workers and use Redis before accepting multi-instance traffic.

## Worker model

Run `npm run worker:once` from one scheduler or operator session. An exclusive lock prevents concurrent beta workers. The command drains up to `WORKER_MAX_JOBS` and exits, allowing scheduled invocation. Queue idempotency keys and atomic database reservation remain authoritative. SIGINT/SIGTERM stop subsequent reservations; an interrupted running job is recovered after the stale interval. Admins can see running count and the last successful job in `/admin/jobs`.

Queued communications, PDF generation, reminders, service-plan generation, and retries share this worker. Schedule it frequently enough for the beta service level; do not run a second scheduler.

## Email smoke checklist

Use `/admin/email-diagnostic` first. The entered address is not customer data.

- [ ] Diagnostic returns a request ID and reaches the inbox.
- [ ] Portal invitation and magic-link emails arrive and links are single-use.
- [ ] Estimate approval email and confirmation flow work.
- [ ] Invoice and receipt delivery arrive with the correct tenant branding.
- [ ] Communication-center email is recorded as Sent and later Delivered.
- [ ] A deliberately rejected test transitions to Failed, Bounced, or Rejected.
- [ ] Duplicate Resend webhook delivery does not duplicate internal events.

## Asset migration and rollback

Run `npm run assets:migrate` for a dry run. Review the JSON, then run `npm run assets:migrate -- --execute`. The command is idempotent, compares object sizes, skips verified targets, reports missing/failed objects, and never deletes local sources. Rollback consists of restoring `PRIVATE_ASSET_STORAGE_DRIVER=local` on the original single host while the local source remains intact. Database URLs do not change during migration.

Run `npm run assets:verify` after migration and after every restore drill. It reconciles database references against objects, reports missing references and orphan objects, sample-downloads objects, and writes machine-readable JSON to stdout. It never deletes data.

## Restore drill

1. Provision isolated PostgreSQL and a separate private Supabase bucket; obtain a verified database backup and object backup/export.
2. Restore the database first, without directing production traffic to it.
3. Restore objects preserving exact keys, then configure the isolated application with the restored bucket.
4. Apply forward migrations and run `npm run assets:verify`, readiness, and integration tests.
5. Test staff private images, customer-visible portal photos, company logos, portal invitation, estimate PDF, invoice, and receipt delivery.
6. Reject the restore if database integrity, referenced objects, access controls, or delivery smoke tests fail. Roll back DNS/traffic to the untouched prior environment.

## Dependency and framework disposition

The accepted moderate `@hono/node-server` advisory is reachable through Prisma CLI build tooling, not the application HTTP runtime. The accepted PostCSS advisory is in Next build-time processing; all CSS input is repository-controlled. Both remain visible in `npm audit` and are evaluated by `beta:verify`; new unaccepted moderate/high/critical findings fail the gate.

Next.js 16 supports the proxy behavior but still warns about the historical `middleware` filename. Migration to the final proxy convention is deferred until its authentication wrapper behavior is verified upstream; route-protection tests remain mandatory. Turbopack filesystem tracing is caused by intentional private-storage filesystem support. The production build route manifest and authenticated asset integration tests verify required runtime inclusion; the warning may increase artifact tracing and is not suppressed.

## Gate

Run `npm run assets:verify` and set `BETA_BACKUP_VERIFIED_AT`, then run `npm run beta:verify` in the production-like isolated environment. The command writes `beta-readiness-report.json` and `.md` and exits non-zero for any missing provider, unhealthy storage, readiness failure, test/build failure, unaccepted advisory, development credential, local production storage, disabled worker, or migration problem. Never point the gate's integration phase at production data.
