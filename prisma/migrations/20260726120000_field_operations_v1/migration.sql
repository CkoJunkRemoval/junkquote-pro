CREATE TYPE "FieldJobStage" AS ENUM ('Scheduled', 'EnRoute', 'Arrived', 'Working', 'Loading', 'Cleanup', 'Completed', 'ReadyForInvoice');
CREATE TYPE "FieldChangeOrderType" AS ENUM ('AdditionalItems', 'AdditionalLabor', 'ExtraDumpFees', 'UnexpectedObstacle');
CREATE TYPE "FieldChangeOrderStatus" AS ENUM ('Pending', 'Approved', 'Declined');
CREATE TYPE "FieldTimeEventType" AS ENUM ('ClockIn', 'BreakStart', 'BreakEnd', 'ClockOut');
CREATE TYPE "FieldOfflineOperationStatus" AS ENUM ('Pending', 'Applied', 'Conflict', 'Failed');

ALTER TABLE "jobs"
  ADD COLUMN "fieldStage" "FieldJobStage" NOT NULL DEFAULT 'Scheduled',
  ADD COLUMN "fieldVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "departureLatitude" DOUBLE PRECISION,
  ADD COLUMN "departureLongitude" DOUBLE PRECISION,
  ADD COLUMN "arrivalLatitude" DOUBLE PRECISION,
  ADD COLUMN "arrivalLongitude" DOUBLE PRECISION,
  ADD COLUMN "completionLatitude" DOUBLE PRECISION,
  ADD COLUMN "completionLongitude" DOUBLE PRECISION,
  ADD COLUMN "travelDurationMinutes" INTEGER,
  ADD COLUMN "crewConfirmedAt" TIMESTAMP(3);

ALTER TABLE "job_photos" ADD COLUMN "annotation" TEXT;

CREATE TABLE "field_checklist_items" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
  "key" TEXT NOT NULL, "label" TEXT NOT NULL, "required" BOOLEAN NOT NULL DEFAULT true,
  "completedAt" TIMESTAMP(3), "completedByEmployeeId" TEXT, "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_checklist_items_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "field_change_orders" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "requestedByEmployeeId" TEXT NOT NULL,
  "type" "FieldChangeOrderType" NOT NULL, "description" TEXT NOT NULL, "proposedAmount" DOUBLE PRECISION NOT NULL,
  "status" "FieldChangeOrderStatus" NOT NULL DEFAULT 'Pending', "customerName" TEXT,
  "customerApprovedAt" TIMESTAMP(3), "customerDeclinedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "field_change_orders_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "job_completion_signatures" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "employeeId" TEXT,
  "printedName" TEXT NOT NULL, "signatureData" TEXT NOT NULL, "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "device" TEXT NOT NULL, "notes" TEXT NOT NULL DEFAULT '', "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "job_completion_signatures_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "field_time_events" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "type" "FieldTimeEventType" NOT NULL, "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "latitude" DOUBLE PRECISION, "longitude" DOUBLE PRECISION, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "field_time_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "field_offline_operations" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "jobId" TEXT NOT NULL, "employeeId" TEXT NOT NULL,
  "clientOperationId" TEXT NOT NULL, "operationType" TEXT NOT NULL, "payload" JSONB NOT NULL, "baseVersion" INTEGER NOT NULL,
  "status" "FieldOfflineOperationStatus" NOT NULL DEFAULT 'Pending', "conflictMessage" TEXT, "appliedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "field_offline_operations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "field_checklist_items_jobId_key_key" ON "field_checklist_items"("jobId", "key");
CREATE INDEX "field_checklist_items_companyId_jobId_completedAt_idx" ON "field_checklist_items"("companyId", "jobId", "completedAt");
CREATE INDEX "field_change_orders_companyId_status_createdAt_idx" ON "field_change_orders"("companyId", "status", "createdAt");
CREATE INDEX "field_change_orders_jobId_createdAt_idx" ON "field_change_orders"("jobId", "createdAt");
CREATE UNIQUE INDEX "job_completion_signatures_jobId_key" ON "job_completion_signatures"("jobId");
CREATE INDEX "job_completion_signatures_companyId_signedAt_idx" ON "job_completion_signatures"("companyId", "signedAt");
CREATE INDEX "field_time_events_companyId_employeeId_timestamp_idx" ON "field_time_events"("companyId", "employeeId", "timestamp");
CREATE INDEX "field_time_events_jobId_employeeId_timestamp_idx" ON "field_time_events"("jobId", "employeeId", "timestamp");
CREATE UNIQUE INDEX "field_offline_operations_companyId_clientOperationId_key" ON "field_offline_operations"("companyId", "clientOperationId");
CREATE INDEX "field_offline_operations_companyId_employeeId_status_createdAt_idx" ON "field_offline_operations"("companyId", "employeeId", "status", "createdAt");
CREATE INDEX "field_offline_operations_jobId_createdAt_idx" ON "field_offline_operations"("jobId", "createdAt");
CREATE INDEX "jobs_companyId_fieldStage_scheduledStart_idx" ON "jobs"("companyId", "fieldStage", "scheduledStart");

ALTER TABLE "field_checklist_items" ADD CONSTRAINT "field_checklist_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_checklist_items" ADD CONSTRAINT "field_checklist_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_checklist_items" ADD CONSTRAINT "field_checklist_items_completedByEmployeeId_fkey" FOREIGN KEY ("completedByEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "field_change_orders" ADD CONSTRAINT "field_change_orders_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_change_orders" ADD CONSTRAINT "field_change_orders_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_change_orders" ADD CONSTRAINT "field_change_orders_requestedByEmployeeId_fkey" FOREIGN KEY ("requestedByEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "job_completion_signatures" ADD CONSTRAINT "job_completion_signatures_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_completion_signatures" ADD CONSTRAINT "job_completion_signatures_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_completion_signatures" ADD CONSTRAINT "job_completion_signatures_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "field_time_events" ADD CONSTRAINT "field_time_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_time_events" ADD CONSTRAINT "field_time_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_time_events" ADD CONSTRAINT "field_time_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_offline_operations" ADD CONSTRAINT "field_offline_operations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_offline_operations" ADD CONSTRAINT "field_offline_operations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "field_offline_operations" ADD CONSTRAINT "field_offline_operations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
