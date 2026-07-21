# API documentation

- `GET /api/health/live`: process liveness.
- `GET /api/health/ready`: configuration, database, schema, and storage readiness.
- `POST /api/webhooks/stripe`: signed, idempotent Stripe Billing events.
- `POST /api/webhooks/resend`: signed communication delivery events.
- `GET /api/analytics/export`: authorized PDF, Excel, or CSV analytics export.
- `GET /api/private/assets/*`: rate-limited, ownership-checked private assets.
- `POST /api/estimates/:id/revisions`: tenant-authorized estimate revision creation.

Server actions handle authenticated mutations. They enforce platform/tenant roles, subscription entitlements, validation, rate limits, audit logging, and tenant ownership.
