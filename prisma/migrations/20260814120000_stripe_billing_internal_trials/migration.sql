ALTER TYPE "SubscriptionPlan" ADD VALUE IF NOT EXISTS 'Free' BEFORE 'Starter';
ALTER TYPE "SubscriptionPlan" RENAME VALUE 'Business' TO 'Enterprise';

CREATE TYPE "BillingInterval" AS ENUM ('Monthly', 'Yearly');
CREATE TYPE "InternalTrialStatus" AS ENUM ('Active', 'Expired', 'Converted', 'Ineligible');

ALTER TABLE "company_subscriptions"
  ALTER COLUMN "plan" SET DEFAULT 'Free',
  ALTER COLUMN "status" SET DEFAULT 'Incomplete',
  ADD COLUMN "trialPlan" "SubscriptionPlan",
  ADD COLUMN "trialStatus" "InternalTrialStatus",
  ADD COLUMN "trialExpiredAt" TIMESTAMP(3),
  ADD COLUMN "paidSubscriptionStartedAt" TIMESTAMP(3),
  ADD COLUMN "billingInterval" "BillingInterval",
  ADD COLUMN "stripePriceId" TEXT,
  ADD COLUMN "lastStripeEventCreatedAt" TIMESTAMP(3),
  ADD COLUMN "lastSuccessfulPaymentAt" TIMESTAMP(3);

-- Preserve all existing tenants without silently granting or restarting trials.
-- Existing valid trials remain consumable; legacy inactive/free tenants are ineligible.
UPDATE "company_subscriptions"
SET "trialPlan" = 'Professional',
    "trialStatus" = CASE
      WHEN "status" = 'Trialing' AND "trialEnd" > CURRENT_TIMESTAMP THEN 'Active'::"InternalTrialStatus"
      WHEN "status" = 'Trialing' THEN 'Expired'::"InternalTrialStatus"
      ELSE 'Ineligible'::"InternalTrialStatus"
    END,
    "trialExpiredAt" = CASE WHEN "status" = 'Trialing' AND "trialEnd" <= CURRENT_TIMESTAMP THEN "trialEnd" ELSE NULL END;

-- Preserve webhook-synchronized legacy paid tenants during cutover. Their existing
-- Stripe subscription and paid period are the migration-time payment evidence.
UPDATE "company_subscriptions"
SET "paidSubscriptionStartedAt" = COALESCE("currentPeriodStart", "createdAt"),
    "lastSuccessfulPaymentAt" = COALESCE("currentPeriodStart", "updatedAt")
WHERE "stripeSubscriptionId" IS NOT NULL AND "status" IN ('Active', 'PastDue');

CREATE INDEX "company_subscriptions_trialStatus_trialEnd_idx" ON "company_subscriptions"("trialStatus", "trialEnd");
CREATE UNIQUE INDEX "system_notifications_companyId_userId_channel_sourceId_key" ON "system_notifications"("companyId", "userId", "channel", "sourceId");

CREATE TABLE "estimate_usage_events" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "estimateId" TEXT NOT NULL,
  "kind" TEXT NOT NULL DEFAULT 'Estimate',
  "createdAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "estimate_usage_events_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "estimate_usage_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "estimate_usage_events_estimateId_key" ON "estimate_usage_events"("estimateId");
CREATE INDEX "estimate_usage_events_companyId_createdAt_idx" ON "estimate_usage_events"("companyId", "createdAt");
INSERT INTO "estimate_usage_events" ("id", "companyId", "estimateId", "kind", "createdAt")
SELECT gen_random_uuid()::text, "companyId", "id", CASE WHEN "revisionRootId" IS NULL THEN 'Estimate' ELSE 'Revision' END, "createdAt" FROM "estimates";
