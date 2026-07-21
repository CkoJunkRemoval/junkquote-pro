ALTER TYPE "EmployeeRole" ADD VALUE IF NOT EXISTS 'Estimator';
ALTER TABLE "employees" ADD COLUMN "invitationStatus" TEXT NOT NULL DEFAULT 'NotInvited', ADD COLUMN "invitationSentAt" TIMESTAMP(3);
