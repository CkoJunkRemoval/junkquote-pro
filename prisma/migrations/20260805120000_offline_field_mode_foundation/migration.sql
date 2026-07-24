CREATE TYPE "OfflineMutationStatus" AS ENUM (
  'Pending', 'Syncing', 'Synced', 'Conflict', 'FailedRetryable',
  'FailedPermanent', 'Cancelled'
);

CREATE TYPE "OfflineMutationType" AS ENUM (
  'JOB_STATUS_UPDATE', 'JOB_FIELD_NOTE_ADD', 'JOB_CHECKLIST_UPDATE',
  'JOB_COMPLETION_STAGE', 'JOB_PHOTO_STAGE', 'JOB_SIGNATURE_STAGE'
);

ALTER TABLE "job_completion_signatures"
  ADD COLUMN "deviceSignedAt" TIMESTAMP(3),
  ADD COLUMN "deviceTimeZone" TEXT,
  ADD COLUMN "consentTextSnapshot" TEXT,
  ADD COLUMN "offlineIdempotencyKey" TEXT;
CREATE UNIQUE INDEX "job_completion_signatures_offlineIdempotencyKey_key"
  ON "job_completion_signatures"("offlineIdempotencyKey");

CREATE TABLE "offline_field_packages" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "packageVersion" INTEGER NOT NULL DEFAULT 1,
  "schemaVersion" INTEGER NOT NULL DEFAULT 1,
  "authorizationVersion" TEXT NOT NULL,
  "sourceRecordVersion" INTEGER NOT NULL,
  "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "lastAcknowledgedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  "revokedByUserId" TEXT,
  "revocationReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offline_field_packages_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "offline_field_mutations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "packageId" TEXT,
  "localMutationId" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "mutationType" "OfflineMutationType" NOT NULL,
  "payload" JSONB NOT NULL,
  "baseRecordVersion" INTEGER NOT NULL,
  "dependencyIds" TEXT[] NOT NULL,
  "status" "OfflineMutationStatus" NOT NULL DEFAULT 'Pending',
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "lastAttemptAt" TIMESTAMP(3),
  "failureClassification" TEXT,
  "failureMessage" TEXT,
  "serverResult" JSONB,
  "appliedAt" TIMESTAMP(3),
  "acknowledgedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "offline_field_mutations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "offline_field_packages_companyId_userId_jobId_key"
  ON "offline_field_packages"("companyId", "userId", "jobId");
CREATE INDEX "offline_field_packages_companyId_userId_expiresAt_idx"
  ON "offline_field_packages"("companyId", "userId", "expiresAt");
CREATE INDEX "offline_field_packages_companyId_jobId_revokedAt_idx"
  ON "offline_field_packages"("companyId", "jobId", "revokedAt");
CREATE UNIQUE INDEX "offline_field_mutations_companyId_idempotencyKey_key"
  ON "offline_field_mutations"("companyId", "idempotencyKey");
CREATE UNIQUE INDEX "offline_field_mutations_companyId_userId_localMutationId_key"
  ON "offline_field_mutations"("companyId", "userId", "localMutationId");
CREATE INDEX "offline_field_mutations_companyId_userId_status_createdAt_idx"
  ON "offline_field_mutations"("companyId", "userId", "status", "createdAt");
CREATE INDEX "offline_field_mutations_companyId_jobId_status_idx"
  ON "offline_field_mutations"("companyId", "jobId", "status");

ALTER TABLE "offline_field_packages"
  ADD CONSTRAINT "offline_field_packages_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_packages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_packages_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_packages_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "offline_field_mutations"
  ADD CONSTRAINT "offline_field_mutations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_mutations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_mutations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "offline_field_mutations_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "offline_field_packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
