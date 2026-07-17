CREATE TYPE "BackgroundJobType" AS ENUM ('SendCommunication', 'GenerateEstimatePdf', 'GenerateInvoicePdf', 'GenerateReceipt', 'CleanupFiles', 'ScheduledReminder', 'WebhookDelivery', 'Future');
CREATE TYPE "BackgroundJobStatus" AS ENUM ('Pending', 'Running', 'Completed', 'Failed', 'Cancelled');
CREATE TYPE "BackgroundJobPriority" AS ENUM ('Low', 'Normal', 'High', 'Critical');
CREATE TYPE "ReminderType" AS ENUM ('EstimateReminder', 'UpcomingJob', 'OutstandingInvoice');

CREATE TABLE "background_jobs" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "BackgroundJobType" NOT NULL,
  "status" "BackgroundJobStatus" NOT NULL DEFAULT 'Pending',
  "priority" "BackgroundJobPriority" NOT NULL DEFAULT 'Normal',
  "payload" JSONB NOT NULL,
  "idempotencyKey" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "maxAttempts" INTEGER NOT NULL DEFAULT 3,
  "lastError" TEXT,
  "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reminder_schedules" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "type" "ReminderType" NOT NULL,
  "targetId" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "payload" JSONB NOT NULL,
  "lastEnqueuedAt" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "reminder_schedules_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "background_jobs_companyId_type_idempotencyKey_key" ON "background_jobs"("companyId", "type", "idempotencyKey");
CREATE INDEX "background_jobs_status_availableAt_priority_createdAt_idx" ON "background_jobs"("status", "availableAt", "priority", "createdAt");
CREATE INDEX "background_jobs_companyId_status_createdAt_idx" ON "background_jobs"("companyId", "status", "createdAt");
CREATE INDEX "reminder_schedules_companyId_type_enabled_scheduledFor_idx" ON "reminder_schedules"("companyId", "type", "enabled", "scheduledFor");

ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "background_jobs" ADD CONSTRAINT "background_jobs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reminder_schedules" ADD CONSTRAINT "reminder_schedules_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
