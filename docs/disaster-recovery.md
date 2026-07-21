# Disaster recovery guide

Maintain encrypted, provider-managed PostgreSQL backups and versioned object-storage backups. Record the latest verified backup and restore exercise outside the primary system.

Quarterly restore test:

1. Provision an isolated recovery database and storage bucket.
2. Restore the latest backup without production credentials.
3. Run migrations, integrity counts, tenant-isolation tests, and readiness checks.
4. Verify signed documents, invoices, payments, audit history, and private assets.
5. Record recovery-point and recovery-time results and destroy recovery resources.

During an incident, suspend writes, preserve logs, identify the recovery point, restore, rotate affected credentials, validate webhooks/jobs, then reopen traffic gradually.
