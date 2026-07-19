# Beta readiness report

- Timestamp: 2026-07-19T00:15:35.001Z
- Commit: 223f73b2d9b345c2b387f3091626c33cbdf36f10
- Migrations: 26
- Build: failed
- Email: blocked
- Storage: blocked
- Advisories: accepted
- Backup verification: not verified
- Worker: blocked
- Final gate: **FAIL**

## Open warnings
- production-environment: Environment validation failed:
- DATABASE_URL is required in production.
- AUTH_SECRET is required in production.
- AUTH_URL or NEXTAUTH_URL is required in production.
- NEXT_PUBLIC_APP_URL is required in production.
- PRIVATE_ASSET_STORAGE_DRIVER is required in production.
- EMAIL_PROVIDER is required in production.
- EMAIL_FROM is required in production.
- BACKGROUND_WORKERS_ENABLED is required in production.
- email-provider: Unsupported email provider configuration.
- storage-provider: Local private storage is disabled in production.
- worker-configuration: BACKGROUND_WORKERS_ENABLED=true is required.
- readiness: DATABASE_URL is not set
- backup-verification: BETA_BACKUP_VERIFIED_AT is required after a restore/backup verification.
- prisma-client: Skipped because the production preflight failed.
- migration-state: Skipped because the production preflight failed.
- typescript: Skipped because the production preflight failed.
- eslint: Skipped because the production preflight failed.
- unit-tests: Skipped because the production preflight failed.
- integration-tests: Skipped because the production preflight failed.
- production-build: Skipped because the production preflight failed.
