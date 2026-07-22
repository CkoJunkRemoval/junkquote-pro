CREATE TYPE "DispatchProgress" AS ENUM ('NotStarted','EnRoute','Arrived');
CREATE TYPE "JobPriority" AS ENUM ('Low','Normal','High','Urgent');
ALTER TABLE "jobs" ADD COLUMN "dispatchProgress" "DispatchProgress" NOT NULL DEFAULT 'NotStarted', ADD COLUMN "priority" "JobPriority" NOT NULL DEFAULT 'Normal', ADD COLUMN "enRouteAt" TIMESTAMP(3), ADD COLUMN "arrivedAt" TIMESTAMP(3), ADD COLUMN "completedAt" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN "userId" TEXT;
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
