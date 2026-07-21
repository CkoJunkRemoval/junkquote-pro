# System administration guide

Grant `platformAdmin` only through an audited database administration process. Platform administrators use `/system-admin` to inspect global metrics, health, queues, companies, errors, flags, and notifications.

Company pages support suspension/reactivation, owner credential reset, global session revocation, and audited support sessions. Never share temporary credentials through audit metadata. All support access requires a written reason.

Feature flags should start disabled, target the narrowest scope, use deterministic percentage rollout, and be monitored before expansion.
# Platform administrator access

`PLATFORM_ADMIN_EMAIL` is a one-time bootstrap identity only when no active persistent platform administrator exists. After bootstrap, grant or revoke `User.platformAdmin` through a reviewed database migration or audited break-glass procedure; changing the environment variable does not silently re-grant a revoked administrator. Keep at least two separately controlled administrators and test revocation before an incident.

Company suspension blocks staff tenant resolution and mutations, revokes customer portal sessions, and invalidates staff session versions. Reactivation restores tenant resolution but does not restore old sessions. Force logout invalidates staff and portal sessions without suspending the company.

Owner password resets email a hashed, single-use link that expires after 30 minutes. Plaintext passwords are never generated, displayed, logged, or returned to an administrator.

Support impersonation is a 30-minute, reason-required, audited support context with a visible banner and explicit exit. Nested sessions are rejected. It does not expose platform controls or payment-provider secrets.

Feature-flag precedence is deterministic: company override, subscription plan, environment, then global default. The newest row within a tier wins, explicit disabled rows override broader enabled rows, rollout bucketing is stable, and evaluation fails closed if storage is unavailable.

System error metadata is redacted before persistence and should be retained for 90 days unless legal requirements specify otherwise. Audit records are not included in this telemetry purge policy.

The production CSP permits Stripe frames/API, configured Supabase storage, and Vercel Insights. Inline scripts/styles remain temporarily allowed for Next.js runtime compatibility; replacing them with request nonces is a documented remaining hardening item. Add external sources only after security review.
