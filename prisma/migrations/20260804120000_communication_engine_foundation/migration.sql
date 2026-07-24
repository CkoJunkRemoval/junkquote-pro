ALTER TYPE "CommunicationDeliveryStatus" ADD VALUE IF NOT EXISTS 'Scheduled';
ALTER TYPE "CommunicationDeliveryStatus" ADD VALUE IF NOT EXISTS 'Processing';
ALTER TYPE "CommunicationDeliveryStatus" ADD VALUE IF NOT EXISTS 'Cancelled';
ALTER TYPE "CommunicationDeliveryStatus" ADD VALUE IF NOT EXISTS 'Suppressed';

CREATE TYPE "CommunicationEventStatus" AS ENUM ('Pending', 'Processing', 'Processed', 'Failed', 'Cancelled');
CREATE TYPE "CommunicationChannel" AS ENUM ('Email', 'Sms', 'Internal', 'Portal');
CREATE TYPE "CommunicationRecipientType" AS ENUM ('Customer', 'Employee', 'User', 'PortalAccess');

CREATE TABLE "communication_templates" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "name" TEXT NOT NULL,
  "subject" TEXT,
  "body" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultTemplate" BOOLEAN NOT NULL DEFAULT false,
  "customerVisible" BOOLEAN NOT NULL DEFAULT true,
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_templates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_preferences" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
  "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "internalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "portalEnabled" BOOLEAN NOT NULL DEFAULT true,
  "quietHoursStart" TEXT,
  "quietHoursEnd" TEXT,
  "timeZone" TEXT NOT NULL DEFAULT 'America/New_York',
  "reminderLeadMinutes" INTEGER NOT NULL DEFAULT 1440,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_preferences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_recipient_preferences" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "customerId" TEXT,
  "employeeId" TEXT,
  "emailAllowed" BOOLEAN NOT NULL DEFAULT true,
  "smsAllowed" BOOLEAN NOT NULL DEFAULT false,
  "portalAllowed" BOOLEAN NOT NULL DEFAULT true,
  "optedOutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_recipient_preferences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "communication_recipient_preferences_recipient_check" CHECK (("customerId" IS NOT NULL) <> ("employeeId" IS NOT NULL))
);

CREATE TABLE "communication_events" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "sourceType" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "processedAt" TIMESTAMP(3),
  "status" "CommunicationEventStatus" NOT NULL DEFAULT 'Pending',
  "dedupeKey" TEXT NOT NULL,
  "failureReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "communication_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "communication_automation_rules" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "channel" "CommunicationChannel" NOT NULL,
  "templateId" TEXT NOT NULL,
  "recipientType" "CommunicationRecipientType" NOT NULL DEFAULT 'Customer',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "delayMinutes" INTEGER NOT NULL DEFAULT 0,
  "respectQuietHours" BOOLEAN NOT NULL DEFAULT true,
  "urgent" BOOLEAN NOT NULL DEFAULT false,
  "cancelOnSourceChange" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "communication_automation_rules_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "communication_deliveries"
  ADD COLUMN "eventId" TEXT,
  ADD COLUMN "templateId" TEXT,
  ADD COLUMN "recipientType" "CommunicationRecipientType",
  ADD COLUMN "recipientId" TEXT,
  ADD COLUMN "destination" TEXT,
  ADD COLUMN "subject" TEXT,
  ADD COLUMN "renderedBody" TEXT,
  ADD COLUMN "failureReason" TEXT,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "scheduledFor" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "failureClass" TEXT,
  ADD COLUMN "delayReason" TEXT;

ALTER TABLE "system_notifications"
  ADD COLUMN "sourceType" TEXT,
  ADD COLUMN "sourceId" TEXT,
  ADD COLUMN "link" TEXT;

CREATE UNIQUE INDEX "communication_templates_companyId_eventType_channel_name_key" ON "communication_templates"("companyId", "eventType", "channel", "name");
CREATE INDEX "communication_templates_companyId_eventType_active_idx" ON "communication_templates"("companyId", "eventType", "active");
CREATE UNIQUE INDEX "communication_preferences_companyId_key" ON "communication_preferences"("companyId");
CREATE UNIQUE INDEX "communication_recipient_preferences_companyId_customerId_key" ON "communication_recipient_preferences"("companyId", "customerId");
CREATE UNIQUE INDEX "communication_recipient_preferences_companyId_employeeId_key" ON "communication_recipient_preferences"("companyId", "employeeId");
CREATE INDEX "communication_recipient_preferences_companyId_optedOutAt_idx" ON "communication_recipient_preferences"("companyId", "optedOutAt");
CREATE UNIQUE INDEX "communication_events_companyId_dedupeKey_key" ON "communication_events"("companyId", "dedupeKey");
CREATE INDEX "communication_events_companyId_eventType_status_occurredAt_idx" ON "communication_events"("companyId", "eventType", "status", "occurredAt");
CREATE INDEX "communication_events_companyId_sourceType_sourceId_occurredAt_idx" ON "communication_events"("companyId", "sourceType", "sourceId", "occurredAt");
CREATE UNIQUE INDEX "communication_automation_rules_companyId_eventType_channel_recipientType_key" ON "communication_automation_rules"("companyId", "eventType", "channel", "recipientType");
CREATE INDEX "communication_automation_rules_companyId_eventType_enabled_idx" ON "communication_automation_rules"("companyId", "eventType", "enabled");
CREATE INDEX "communication_deliveries_companyId_status_scheduledFor_idx" ON "communication_deliveries"("companyId", "status", "scheduledFor");
CREATE INDEX "communication_deliveries_companyId_recipientType_recipientId_createdAt_idx" ON "communication_deliveries"("companyId", "recipientType", "recipientId", "createdAt");
CREATE INDEX "communication_deliveries_eventId_idx" ON "communication_deliveries"("eventId");
CREATE INDEX "system_notifications_companyId_userId_readAt_createdAt_idx" ON "system_notifications"("companyId", "userId", "readAt", "createdAt");

ALTER TABLE "communication_templates" ADD CONSTRAINT "communication_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_preferences" ADD CONSTRAINT "communication_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_recipient_preferences" ADD CONSTRAINT "communication_recipient_preferences_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_recipient_preferences" ADD CONSTRAINT "communication_recipient_preferences_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_recipient_preferences" ADD CONSTRAINT "communication_recipient_preferences_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_events" ADD CONSTRAINT "communication_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_automation_rules" ADD CONSTRAINT "communication_automation_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "communication_automation_rules" ADD CONSTRAINT "communication_automation_rules_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "communication_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "communication_deliveries" ADD CONSTRAINT "communication_deliveries_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "communication_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
