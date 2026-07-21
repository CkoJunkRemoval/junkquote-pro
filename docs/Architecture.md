# JunkQuote Pro architecture

JunkQuote Pro is a Next.js application with PostgreSQL/Prisma persistence, JWT staff authentication, tenant-scoped services, a database-backed job queue, private object storage, Stripe Billing, and Resend-compatible communications.

Every business record carries or inherits a company identifier. Tenant services accept a trusted company ID resolved from an active membership. `/system-admin` is a separate control plane guarded by `User.platformAdmin`; tenant roles never grant platform access.

Core layers: app routes and server actions → authorization/entitlement services → domain services → Prisma. Cross-cutting systems include audit events, feature flags, notifications, system errors, usage counters, queue workers, readiness probes, and structured logging.

Scaling priorities are stateless web instances, pooled PostgreSQL connections, independently scaled queue workers, external object storage, bounded queries, idempotent webhooks/jobs, and pre-aggregated daily usage metrics.
