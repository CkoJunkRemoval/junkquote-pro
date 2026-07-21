ALTER TYPE "DispatchProgress" ADD VALUE 'Loading';

ALTER TABLE "jobs"
ADD COLUMN "jobNumber" TEXT,
ADD COLUMN "truck" TEXT,
ADD COLUMN "finalInvoiceAmount" DOUBLE PRECISION;

CREATE UNIQUE INDEX "jobs_jobNumber_key" ON "jobs"("jobNumber");
