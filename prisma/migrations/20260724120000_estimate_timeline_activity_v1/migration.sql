CREATE TYPE "EstimateEventCategory" AS ENUM ('Lifecycle','Estimate','Customer','Property','Items','Pricing','Photos','Notes','Communication','Scheduling','Job','Invoice','Payment','Revision');
CREATE TYPE "EstimateEventActorType" AS ENUM ('System','Employee','Customer','PlatformAdmin');
CREATE TYPE "EstimateEventVisibility" AS ENUM ('Internal','Customer','Both');

ALTER TABLE "estimate_timeline_events"
  ADD COLUMN "category" "EstimateEventCategory" NOT NULL DEFAULT 'Estimate',
  ADD COLUMN "actorType" "EstimateEventActorType" NOT NULL DEFAULT 'System',
  ADD COLUMN "actorId" TEXT,
  ADD COLUMN "actorDisplayName" TEXT,
  ADD COLUMN "title" TEXT,
  ADD COLUMN "summary" TEXT,
  ADD COLUMN "visibility" "EstimateEventVisibility" NOT NULL DEFAULT 'Internal',
  ADD COLUMN "searchText" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "jobId" TEXT;

UPDATE "estimate_timeline_events" e SET
  "actorDisplayName" = e."actor",
  "title" = e."eventType",
  "summary" = COALESCE((SELECT a."message" FROM "estimate_activity_feed_items" a WHERE a."estimateId" = e."estimateId" AND a."eventType" = e."eventType" ORDER BY a."createdAt" DESC LIMIT 1), e."eventType"),
  "searchText" = lower(concat_ws(' ', e."eventType", e."actor"));

ALTER TABLE "estimate_timeline_events"
  ALTER COLUMN "actorDisplayName" SET NOT NULL,
  ALTER COLUMN "title" SET NOT NULL,
  ALTER COLUMN "summary" SET NOT NULL;

DROP INDEX IF EXISTS "estimate_timeline_events_estimateId_timestamp_idx";
DROP INDEX IF EXISTS "estimate_timeline_events_companyId_timestamp_idx";
CREATE INDEX "estimate_timeline_events_estimateId_timestamp_id_idx" ON "estimate_timeline_events"("estimateId", "timestamp", "id");
CREATE INDEX "estimate_timeline_events_companyId_timestamp_id_idx" ON "estimate_timeline_events"("companyId", "timestamp", "id");
CREATE INDEX "estimate_timeline_events_companyId_category_timestamp_id_idx" ON "estimate_timeline_events"("companyId", "category", "timestamp", "id");
CREATE INDEX "estimate_timeline_events_companyId_actorId_timestamp_id_idx" ON "estimate_timeline_events"("companyId", "actorId", "timestamp", "id");
CREATE INDEX "estimate_timeline_events_companyId_visibility_timestamp_id_idx" ON "estimate_timeline_events"("companyId", "visibility", "timestamp", "id");
CREATE INDEX "estimate_timeline_events_companyId_jobId_timestamp_id_idx" ON "estimate_timeline_events"("companyId", "jobId", "timestamp", "id");

CREATE TABLE "estimate_event_attachments" (
  "id" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "referenceType" TEXT NOT NULL,
  "referenceId" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "url" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "estimate_event_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "estimate_event_attachments_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "estimate_timeline_events"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "estimate_event_attachments_eventId_idx" ON "estimate_event_attachments"("eventId");
CREATE INDEX "estimate_event_attachments_referenceType_referenceId_idx" ON "estimate_event_attachments"("referenceType", "referenceId");
