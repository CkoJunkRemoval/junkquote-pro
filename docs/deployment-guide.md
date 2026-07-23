# Deployment guide

1. Validate all variables documented in `.env.example`.
2. Use separate production/test databases and Stripe modes.
3. Run `prisma migrate deploy`, then Prisma generation.
4. Run TypeScript, ESLint, unit/integration tests, and the production build.
5. Deploy stateless web instances and independently managed background workers.
6. Verify `/api/health/live` and `/api/health/ready` before traffic.
7. Confirm HTTPS, storage, email, backups, alerts, and any enabled optional integrations.

Core startup requires the database, strong authentication secret, HTTPS authentication/application URLs, private storage, production email delivery, and `PLATFORM_ADMIN_EMAIL`. `CONTENT_SECURITY_POLICY` is an optional override; when absent, the application uses its audited built-in production policy.

Stripe billing, Redis coordination, push notifications, and future provider integrations are optional. Configure each integration as a complete group. Missing or partial optional configuration disables the feature and appears in startup logs, readiness warnings, and the system-admin dashboard without taking down authentication or ordinary application usage.

Do not expose platform-admin routes through tenant role assignment.
# Distributed coordination

For distributed production coordination, configure a Vercel KV or Upstash-compatible Redis REST endpoint with `KV_REST_API_URL` and `KV_REST_API_TOKEN`; `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are accepted aliases. The URL must use HTTPS. Never log either value.

Without Redis, coordination uses a process-local TTL fallback. Authentication and ordinary usage remain available, while readiness and administration report degraded coordination. This fallback does not coordinate across multiple instances, so Redis remains strongly recommended for horizontally scaled deployments.

Development, tests, and Redis-disabled production use the explicitly reported process-memory implementation. For production-like distributed testing, configure the REST variables.

Distributed locks use random ownership tokens, TTLs, `SET NX PX`, and compare-and-delete Lua release. Current lock namespaces are `queue-worker`, `admin-job-retry`, `billing-checkout`, `stripe-webhook`, `resend-webhook`, `usage-aggregation`, and `telemetry-cleanup`.
