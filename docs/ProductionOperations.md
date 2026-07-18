# Production operations

## Configuration and release gate

Production startup validates database, authentication, canonical HTTPS URLs, private storage, email delivery, and background-worker configuration. Secrets must be injected by the deployment platform and must never be committed. Run `npm ci`, `npx prisma migrate deploy`, `npx prisma generate`, `npm run build`, and the readiness check before shifting traffic.

## Database backup and restore

No automated backup system is configured by this repository. Configure provider-managed point-in-time recovery and daily encrypted snapshots before beta. Keep backups in a separate account or region with documented retention. Quarterly, restore the newest backup into an isolated database, apply migrations, run readiness and integration checks, and record recovery time and data-loss window. Never restore over production during a test.

Migrations are forward-only in production. Roll back application code only when it remains compatible with the deployed schema. Correct a schema defect with a reviewed compensating migration. Take a verified backup before destructive or high-volume migrations.

## Private assets

The local storage driver writes beneath `PRIVATE_ASSET_STORAGE_ROOT`; that directory is not public and must be backed up separately using encrypted, versioned storage. Restore assets to an isolated path and verify authenticated delivery. Multi-instance production should replace local storage with a shared private object-store driver before horizontal scaling.

## Incident response

1. Preserve request IDs, structured logs, audit events, and relevant provider timestamps.
2. Suspend compromised staff memberships or users and revoke customer portal sessions.
3. Rotate `AUTH_SECRET`, database credentials, and email/provider credentials through the deployment secret store. Rotating `AUTH_SECRET` signs out staff; revoke portal sessions separately in the database/application controls.
4. Restrict traffic, disable workers or provider delivery when needed, and preserve evidence.
5. Restore service only after readiness checks, focused regression tests, and an incident-owner decision.
6. Document impact, timeline, remediation, and follow-up controls without copying secrets or customer content.

## Portal and staff containment

Revoking portal access invalidates outstanding portal tokens and sessions. For broad containment, revoke all active portal sessions for the affected company. Disable a compromised staff user and suspend memberships; do not merely change the visible employee status. Audit all financial and security events around the compromise window.

## Rate limiting limitation

The beta limiter is process-local and resets when the process restarts. It is suitable for a single-instance controlled beta but not distributed enforcement. Before multiple application instances or public launch, replace it with an atomic shared store such as managed Redis while retaining the existing limiter interface.
