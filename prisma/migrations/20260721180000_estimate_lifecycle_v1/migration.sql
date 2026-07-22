ALTER TYPE "EstimateStatus" RENAME TO "EstimateStatus_old";
CREATE TYPE "EstimateStatus" AS ENUM ('Draft','Sent','Viewed','Approved','Scheduled','InProgress','Completed','Invoiced','Paid','Declined','Expired','Canceled');
ALTER TABLE "estimates" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "estimates" ALTER COLUMN "status" TYPE "EstimateStatus" USING (
  CASE "status"::text WHEN 'Ready' THEN 'Draft' WHEN 'Archived' THEN 'Completed' ELSE "status"::text END
)::"EstimateStatus";
ALTER TABLE "estimates" ALTER COLUMN "status" SET DEFAULT 'Draft';
DROP TYPE "EstimateStatus_old";

CREATE TABLE "estimate_timeline_events" (
  "id" TEXT NOT NULL, "eventType" TEXT NOT NULL, "estimateId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL, "actor" TEXT NOT NULL, "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB, CONSTRAINT "estimate_timeline_events_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "estimate_activity_feed_items" (
  "id" TEXT NOT NULL, "estimateId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "actor" TEXT NOT NULL, "message" TEXT NOT NULL, "eventType" TEXT NOT NULL, "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estimate_activity_feed_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "estimate_timeline_events_estimateId_timestamp_idx" ON "estimate_timeline_events"("estimateId","timestamp");
CREATE INDEX "estimate_timeline_events_companyId_timestamp_idx" ON "estimate_timeline_events"("companyId","timestamp");
CREATE INDEX "estimate_activity_feed_items_estimateId_createdAt_idx" ON "estimate_activity_feed_items"("estimateId","createdAt");
CREATE INDEX "estimate_activity_feed_items_companyId_createdAt_idx" ON "estimate_activity_feed_items"("companyId","createdAt");
ALTER TABLE "estimate_timeline_events" ADD CONSTRAINT "estimate_timeline_events_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_timeline_events" ADD CONSTRAINT "estimate_timeline_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_activity_feed_items" ADD CONSTRAINT "estimate_activity_feed_items_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "estimate_activity_feed_items" ADD CONSTRAINT "estimate_activity_feed_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
