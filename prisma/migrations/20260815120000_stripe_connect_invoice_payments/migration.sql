CREATE TYPE "StripeConnectStatus" AS ENUM ('NOT_CONNECTED', 'ONBOARDING', 'ACTION_REQUIRED', 'CONNECTED', 'RESTRICTED');
CREATE TYPE "ConnectedPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED', 'DISPUTED');

ALTER TABLE "companies"
  ADD COLUMN "stripeConnectedAccountId" TEXT,
  ADD COLUMN "stripeConnectStatus" "StripeConnectStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
  ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeDetailsSubmitted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectRequirementsDue" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "stripeConnectConnectedAt" TIMESTAMP(3),
  ADD COLUMN "stripeConnectUpdatedAt" TIMESTAMP(3),
  ADD COLUMN "stripeConnectDisconnectedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "companies_stripeConnectedAccountId_key" ON "companies"("stripeConnectedAccountId");

ALTER TABLE "payments"
  ADD COLUMN "connectedPaymentStatus" "ConnectedPaymentStatus",
  ADD COLUMN "stripeCheckoutSessionId" TEXT,
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "stripeChargeId" TEXT,
  ADD COLUMN "stripeConnectedAccountId" TEXT,
  ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'usd',
  ADD COLUMN "refundedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "payments_stripeCheckoutSessionId_key" ON "payments"("stripeCheckoutSessionId");
CREATE INDEX "payments_stripeConnectedAccountId_stripePaymentIntentId_idx" ON "payments"("stripeConnectedAccountId", "stripePaymentIntentId");
ALTER TABLE "refunds" DROP CONSTRAINT "refunds_createdByUserId_fkey";
ALTER TABLE "refunds" ALTER COLUMN "createdByUserId" DROP NOT NULL;
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "refunds_companyId_externalReference_key" ON "refunds"("companyId", "externalReference");
