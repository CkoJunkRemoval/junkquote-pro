# Deployment guide

1. Validate all variables documented in `.env.example`.
2. Use separate production/test databases and Stripe modes.
3. Run `prisma migrate deploy`, then Prisma generation.
4. Run TypeScript, ESLint, unit/integration tests, and the production build.
5. Deploy stateless web instances and independently managed background workers.
6. Verify `/api/health/live` and `/api/health/ready` before traffic.
7. Confirm CSP, HTTPS, storage, email, Stripe webhooks, backups, and alerts.

Do not expose platform-admin routes through tenant role assignment.
# Distributed coordination

Production requires a Vercel KV or Upstash-compatible Redis REST endpoint. Configure `KV_REST_API_URL` and `KV_REST_API_TOKEN`; `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are accepted aliases. The URL must use HTTPS. Never log either value.

Rate limiting and login lockouts fail closed if Redis is unreachable. Webhooks, billing changes, password resets, signup/sign-in, public approval access, exports, and administrative retries are blocked until enforcement is available. Readiness reports Redis failure and returns HTTP 503. Ordinary authenticated tenant reads that do not require coordination remain available.

Development and tests use an explicitly reported process-memory implementation only when Redis is not configured. Production refuses to construct that fallback. For production-like local testing, configure the REST variables.

Distributed locks use random ownership tokens, TTLs, `SET NX PX`, and compare-and-delete Lua release. Current lock namespaces are `queue-worker`, `admin-job-retry`, `billing-checkout`, `stripe-webhook`, `resend-webhook`, `usage-aggregation`, and `telemetry-cleanup`.
