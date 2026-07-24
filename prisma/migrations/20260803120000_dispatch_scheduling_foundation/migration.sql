CREATE TYPE "SchedulingStatus" AS ENUM (
  'Unscheduled','Tentative','Scheduled','Confirmed','EnRoute','Arrived',
  'InProgress','Completed','Delayed','Cancelled','NoShow'
);
CREATE TYPE "JobAssignmentRole" AS ENUM ('CrewLead','Driver','Helper','Estimator','Specialist');
CREATE TYPE "JobAssignmentStatus" AS ENUM ('Assigned','Confirmed','Declined','Removed');
CREATE TYPE "EmployeeAvailabilityType" AS ENUM ('WorkingHours','Unavailable','TimeOff');
ALTER TYPE "FleetAssetType" ADD VALUE IF NOT EXISTS 'Pickup';
ALTER TYPE "FleetAssetType" ADD VALUE IF NOT EXISTS 'BoxTruck';
ALTER TYPE "FleetAssetType" ADD VALUE IF NOT EXISTS 'DumpTruck';
ALTER TYPE "FleetAssetType" ADD VALUE IF NOT EXISTS 'Van';
ALTER TYPE "FleetAssetType" ADD VALUE IF NOT EXISTS 'Other';

ALTER TABLE "jobs"
  ADD COLUMN "arrivalWindowStart" TIMESTAMP(3),
  ADD COLUMN "arrivalWindowEnd" TIMESTAMP(3),
  ADD COLUMN "estimatedDurationMinutes" INTEGER,
  ADD COLUMN "schedulingStatus" "SchedulingStatus" NOT NULL DEFAULT 'Unscheduled',
  ADD COLUMN "dispatchNotes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "internalAccessNotes" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "customerInstructions" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "allDay" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
  ADD COLUMN "scheduleVersion" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastScheduledAt" TIMESTAMP(3),
  ADD COLUMN "lastScheduledById" TEXT;

UPDATE "jobs"
SET "schedulingStatus" = CASE
  WHEN "status" = 'Completed' THEN 'Completed'::"SchedulingStatus"
  WHEN "status" = 'Cancelled' THEN 'Cancelled'::"SchedulingStatus"
  WHEN "status" = 'InProgress' THEN 'InProgress'::"SchedulingStatus"
  WHEN "scheduledStart" IS NOT NULL THEN 'Scheduled'::"SchedulingStatus"
  ELSE 'Unscheduled'::"SchedulingStatus"
END,
"estimatedDurationMinutes" = CASE
  WHEN "scheduledStart" IS NOT NULL AND "scheduledEnd" IS NOT NULL
  THEN GREATEST(1, ROUND(EXTRACT(EPOCH FROM ("scheduledEnd" - "scheduledStart")) / 60)::INTEGER)
  ELSE NULL
END;

ALTER TABLE "job_assignments"
  ADD COLUMN "assignedById" TEXT,
  ADD COLUMN "role" "JobAssignmentRole" NOT NULL DEFAULT 'Helper',
  ADD COLUMN "lead" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "status" "JobAssignmentStatus" NOT NULL DEFAULT 'Assigned';

ALTER TABLE "fleet_assets"
  ADD COLUMN "capacityCubicYards" DOUBLE PRECISION,
  ADD COLUMN "colorLabel" TEXT;

CREATE TABLE "job_vehicle_assignments" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "fleetAssetId" TEXT NOT NULL,
  "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "assignedById" TEXT,
  CONSTRAINT "job_vehicle_assignments_pkey" PRIMARY KEY ("id")
);

INSERT INTO "job_vehicle_assignments" ("id","companyId","jobId","fleetAssetId")
SELECT "id" || ':vehicle:' || "assignedFleetAssetId", "companyId", "id", "assignedFleetAssetId"
FROM "jobs" WHERE "assignedFleetAssetId" IS NOT NULL;

CREATE TABLE "employee_availability" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" "EmployeeAvailabilityType" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3) NOT NULL,
  "recurringDayOfWeek" INTEGER,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "employee_availability_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "employee_availability_time_check" CHECK ("endsAt" > "startsAt"),
  CONSTRAINT "employee_availability_day_check" CHECK ("recurringDayOfWeek" IS NULL OR ("recurringDayOfWeek" BETWEEN 0 AND 6))
);

CREATE UNIQUE INDEX "job_vehicle_assignments_jobId_fleetAssetId_key" ON "job_vehicle_assignments"("jobId","fleetAssetId");
CREATE INDEX "job_vehicle_assignments_companyId_idx" ON "job_vehicle_assignments"("companyId");
CREATE INDEX "job_vehicle_assignments_fleetAssetId_idx" ON "job_vehicle_assignments"("fleetAssetId");
CREATE INDEX "employee_availability_companyId_startsAt_endsAt_idx" ON "employee_availability"("companyId","startsAt","endsAt");
CREATE INDEX "employee_availability_employeeId_startsAt_endsAt_idx" ON "employee_availability"("employeeId","startsAt","endsAt");
CREATE INDEX "jobs_companyId_schedulingStatus_scheduledStart_idx" ON "jobs"("companyId","schedulingStatus","scheduledStart");

ALTER TABLE "jobs" ADD CONSTRAINT "jobs_lastScheduledById_fkey" FOREIGN KEY ("lastScheduledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_assignments" ADD CONSTRAINT "job_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "job_vehicle_assignments" ADD CONSTRAINT "job_vehicle_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_vehicle_assignments" ADD CONSTRAINT "job_vehicle_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_vehicle_assignments" ADD CONSTRAINT "job_vehicle_assignments_fleetAssetId_fkey" FOREIGN KEY ("fleetAssetId") REFERENCES "fleet_assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "job_vehicle_assignments" ADD CONSTRAINT "job_vehicle_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employee_availability" ADD CONSTRAINT "employee_availability_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "employee_availability" ADD CONSTRAINT "employee_availability_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
