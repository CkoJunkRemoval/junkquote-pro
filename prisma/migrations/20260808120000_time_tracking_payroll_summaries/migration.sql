CREATE TYPE "TimeClockEventType" AS ENUM ('ClockIn', 'ClockOut', 'BreakStart', 'BreakEnd');
CREATE TYPE "TimeEntrySource" AS ENUM ('Mobile', 'Desktop', 'Manual', 'Import', 'System');
CREATE TYPE "TimesheetStatus" AS ENUM ('Open', 'Submitted', 'Approved', 'Rejected', 'Locked');
CREATE TYPE "PayPeriodStatus" AS ENUM ('Open', 'Review', 'Approved', 'Exported', 'Locked');
CREATE TYPE "PayPeriodFrequency" AS ENUM ('Weekly', 'Biweekly', 'Semimonthly', 'Monthly', 'Custom');
CREATE TYPE "TimeAllocationCategory" AS ENUM ('Job', 'Shop', 'Travel', 'DumpRun', 'Maintenance', 'Training', 'Admin', 'Other');
CREATE TYPE "TimeCorrectionStatus" AS ENUM ('Pending', 'Approved', 'Rejected', 'Applied');
CREATE TYPE "TimesheetApprovalAction" AS ENUM ('Submitted', 'Approved', 'Rejected', 'Locked', 'Unlocked');

CREATE TABLE "company_timekeeping_settings" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
  "payPeriodFrequency" "PayPeriodFrequency" NOT NULL DEFAULT 'Biweekly',
  "workweekStartDay" INTEGER NOT NULL DEFAULT 0,
  "overtimeThresholdMinutes" INTEGER NOT NULL DEFAULT 2400,
  "openBreakWarningMinutes" INTEGER NOT NULL DEFAULT 60,
  "automaticBreakDeductionMinutes" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_timekeeping_settings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_clock_events" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "eventType" "TimeClockEventType" NOT NULL,
  "eventTimestamp" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "source" "TimeEntrySource" NOT NULL,
  "jobId" TEXT,
  "crewId" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "locationAccuracyMeters" DOUBLE PRECISION,
  "notes" TEXT,
  "createdById" TEXT NOT NULL,
  "correctionReason" TEXT,
  "originalEventId" TEXT,
  "correctedById" TEXT,
  "correctedAt" TIMESTAMP(3),
  "voidedAt" TIMESTAMP(3),
  "idempotencyKey" TEXT,
  "deviceTimestamp" TIMESTAMP(3),
  "syncedAt" TIMESTAMP(3),
  "syncFailure" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "time_clock_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_sessions" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "clockInEventId" TEXT NOT NULL,
  "clockOutEventId" TEXT,
  "clockInAt" TIMESTAMP(3) NOT NULL,
  "clockOutAt" TIMESTAMP(3),
  "timezone" TEXT NOT NULL,
  "source" "TimeEntrySource" NOT NULL,
  "crewId" TEXT,
  "unpaidBreakMinutes" INTEGER NOT NULL DEFAULT 0,
  "paidBreakMinutes" INTEGER NOT NULL DEFAULT 0,
  "grossMinutes" INTEGER NOT NULL DEFAULT 0,
  "payableMinutes" INTEGER NOT NULL DEFAULT 0,
  "regularMinutes" INTEGER NOT NULL DEFAULT 0,
  "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "manuallyAdjusted" BOOLEAN NOT NULL DEFAULT false,
  "approvalStatus" "TimesheetStatus" NOT NULL DEFAULT 'Open',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "work_session_allocations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "workSessionId" TEXT NOT NULL,
  "jobId" TEXT,
  "category" "TimeAllocationCategory" NOT NULL,
  "allocatedMinutes" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "work_session_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "time_correction_requests" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "eventId" TEXT,
  "requestedEventType" "TimeClockEventType",
  "requestedTimestamp" TIMESTAMP(3),
  "requestedJobId" TEXT,
  "reason" TEXT NOT NULL,
  "status" "TimeCorrectionStatus" NOT NULL DEFAULT 'Pending',
  "requestedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "time_correction_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "pay_periods" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "timezone" TEXT NOT NULL,
  "status" "PayPeriodStatus" NOT NULL DEFAULT 'Open',
  "exportedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "lockedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pay_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timesheets" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "payPeriodId" TEXT NOT NULL,
  "status" "TimesheetStatus" NOT NULL DEFAULT 'Open',
  "regularMinutes" INTEGER NOT NULL DEFAULT 0,
  "overtimeMinutes" INTEGER NOT NULL DEFAULT 0,
  "unpaidBreakMinutes" INTEGER NOT NULL DEFAULT 0,
  "jobLaborMinutes" INTEGER NOT NULL DEFAULT 0,
  "nonJobLaborMinutes" INTEGER NOT NULL DEFAULT 0,
  "exceptionFlags" TEXT[],
  "employeeNotes" TEXT,
  "managerNotes" TEXT,
  "submittedAt" TIMESTAMP(3),
  "approvedAt" TIMESTAMP(3),
  "rejectedAt" TIMESTAMP(3),
  "lockedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "timesheets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "timesheet_approval_events" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "timesheetId" TEXT NOT NULL,
  "action" "TimesheetApprovalAction" NOT NULL,
  "actorUserId" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "timesheet_approval_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "company_timekeeping_settings_companyId_key" ON "company_timekeeping_settings"("companyId");
CREATE UNIQUE INDEX "time_clock_events_companyId_idempotencyKey_key" ON "time_clock_events"("companyId", "idempotencyKey");
CREATE INDEX "time_clock_events_companyId_employeeId_eventTimestamp_idx" ON "time_clock_events"("companyId", "employeeId", "eventTimestamp");
CREATE INDEX "time_clock_events_companyId_eventType_eventTimestamp_idx" ON "time_clock_events"("companyId", "eventType", "eventTimestamp");
CREATE INDEX "time_clock_events_jobId_eventTimestamp_idx" ON "time_clock_events"("jobId", "eventTimestamp");
CREATE INDEX "time_clock_events_crewId_eventTimestamp_idx" ON "time_clock_events"("crewId", "eventTimestamp");
CREATE INDEX "time_clock_events_originalEventId_idx" ON "time_clock_events"("originalEventId");
CREATE UNIQUE INDEX "work_sessions_clockInEventId_key" ON "work_sessions"("clockInEventId");
CREATE UNIQUE INDEX "work_sessions_clockOutEventId_key" ON "work_sessions"("clockOutEventId");
CREATE INDEX "work_sessions_companyId_employeeId_clockInAt_idx" ON "work_sessions"("companyId", "employeeId", "clockInAt");
CREATE INDEX "work_sessions_companyId_approvalStatus_clockInAt_idx" ON "work_sessions"("companyId", "approvalStatus", "clockInAt");
CREATE INDEX "work_sessions_crewId_clockInAt_idx" ON "work_sessions"("crewId", "clockInAt");
CREATE INDEX "work_session_allocations_companyId_employeeId_createdAt_idx" ON "work_session_allocations"("companyId", "employeeId", "createdAt");
CREATE INDEX "work_session_allocations_workSessionId_idx" ON "work_session_allocations"("workSessionId");
CREATE INDEX "work_session_allocations_jobId_idx" ON "work_session_allocations"("jobId");
CREATE INDEX "time_correction_requests_companyId_status_createdAt_idx" ON "time_correction_requests"("companyId", "status", "createdAt");
CREATE INDEX "time_correction_requests_companyId_employeeId_createdAt_idx" ON "time_correction_requests"("companyId", "employeeId", "createdAt");
CREATE UNIQUE INDEX "pay_periods_companyId_startDate_endDate_key" ON "pay_periods"("companyId", "startDate", "endDate");
CREATE INDEX "pay_periods_companyId_status_startDate_idx" ON "pay_periods"("companyId", "status", "startDate");
CREATE UNIQUE INDEX "timesheets_employeeId_payPeriodId_key" ON "timesheets"("employeeId", "payPeriodId");
CREATE INDEX "timesheets_companyId_payPeriodId_status_idx" ON "timesheets"("companyId", "payPeriodId", "status");
CREATE INDEX "timesheets_companyId_employeeId_createdAt_idx" ON "timesheets"("companyId", "employeeId", "createdAt");
CREATE INDEX "timesheet_approval_events_companyId_timesheetId_createdAt_idx" ON "timesheet_approval_events"("companyId", "timesheetId", "createdAt");

ALTER TABLE "company_timekeeping_settings" ADD CONSTRAINT "company_timekeeping_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_originalEventId_fkey" FOREIGN KEY ("originalEventId") REFERENCES "time_clock_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_clock_events" ADD CONSTRAINT "time_clock_events_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "work_session_allocations" ADD CONSTRAINT "work_session_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_session_allocations" ADD CONSTRAINT "work_session_allocations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "work_session_allocations" ADD CONSTRAINT "work_session_allocations_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "work_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "work_session_allocations" ADD CONSTRAINT "work_session_allocations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "time_clock_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "time_correction_requests" ADD CONSTRAINT "time_correction_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pay_periods" ADD CONSTRAINT "pay_periods_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheets" ADD CONSTRAINT "timesheets_payPeriodId_fkey" FOREIGN KEY ("payPeriodId") REFERENCES "pay_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "timesheet_approval_events" ADD CONSTRAINT "timesheet_approval_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timesheet_approval_events" ADD CONSTRAINT "timesheet_approval_events_timesheetId_fkey" FOREIGN KEY ("timesheetId") REFERENCES "timesheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "timesheet_approval_events" ADD CONSTRAINT "timesheet_approval_events_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
