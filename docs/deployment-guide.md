# Deployment guide

1. Validate all variables documented in `.env.example`.
2. Use separate production/test databases and Stripe modes.
3. Run `prisma migrate deploy`, then Prisma generation.
4. Run TypeScript, ESLint, unit/integration tests, and the production build.
5. Deploy stateless web instances and independently managed background workers.
6. Verify `/api/health/live` and `/api/health/ready` before traffic.
7. Confirm CSP, HTTPS, storage, email, Stripe webhooks, backups, and alerts.

Do not expose platform-admin routes through tenant role assignment.
