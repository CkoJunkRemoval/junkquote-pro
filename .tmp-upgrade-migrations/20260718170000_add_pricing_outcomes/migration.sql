CREATE TYPE "SmartPricingDecisionType" AS ENUM ('Accepted', 'PartiallyAdjusted', 'Ignored', 'Unavailable');
ALTER TABLE "jobs" ADD COLUMN "actualLaborHours" DOUBLE PRECISION, ADD COLUMN "actualLaborCost" DOUBLE PRECISION,
ADD COLUMN "actualDisposalCost" DOUBLE PRECISION, ADD COLUMN "actualTravelCost" DOUBLE PRECISION,
ADD COLUMN "otherActualCost" DOUBLE PRECISION, ADD COLUMN "actualCostNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "smart_pricing_decisions" ADD COLUMN "decision" "SmartPricingDecisionType" NOT NULL DEFAULT 'Unavailable',
ADD COLUMN "finalQuotedAmount" DOUBLE PRECISION, ADD COLUMN "difference" DOUBLE PRECISION,
ADD COLUMN "decidedAt" TIMESTAMP(3), ADD COLUMN "actingUserId" TEXT;
CREATE TABLE "pricing_outcomes" (
 "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "estimateId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
 "invoiceId" TEXT, "customerId" TEXT NOT NULL, "quotedAmount" DOUBLE PRECISION NOT NULL,
 "invoicedAmount" DOUBLE PRECISION, "collectedAmount" DOUBLE PRECISION NOT NULL, "discountAmount" DOUBLE PRECISION NOT NULL,
 "refundAmount" DOUBLE PRECISION NOT NULL, "laborHoursEstimated" DOUBLE PRECISION NOT NULL,
 "laborHoursActual" DOUBLE PRECISION, "laborCostEstimated" DOUBLE PRECISION, "laborCostActual" DOUBLE PRECISION,
 "disposalCostEstimated" DOUBLE PRECISION, "disposalCostActual" DOUBLE PRECISION,
 "travelCostEstimated" DOUBLE PRECISION, "travelCostActual" DOUBLE PRECISION, "otherCostActual" DOUBLE PRECISION,
 "grossProfit" DOUBLE PRECISION, "grossMarginPercent" DOUBLE PRECISION, "estimateVarianceAmount" DOUBLE PRECISION,
 "estimateVariancePercent" DOUBLE PRECISION, "completenessScore" INTEGER NOT NULL, "missingData" JSONB NOT NULL,
 "classification" TEXT NOT NULL, "collectionStatus" TEXT NOT NULL, "completedAt" TIMESTAMP(3) NOT NULL,
 "calculatedAt" TIMESTAMP(3) NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "pricing_outcomes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pricing_outcomes_jobId_key" ON "pricing_outcomes"("jobId");
CREATE UNIQUE INDEX "pricing_outcomes_invoiceId_key" ON "pricing_outcomes"("invoiceId");
CREATE INDEX "pricing_outcomes_companyId_completedAt_idx" ON "pricing_outcomes"("companyId", "completedAt");
CREATE INDEX "pricing_outcomes_companyId_classification_idx" ON "pricing_outcomes"("companyId", "classification");
ALTER TABLE "pricing_outcomes" ADD CONSTRAINT "pricing_outcomes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_outcomes" ADD CONSTRAINT "pricing_outcomes_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_outcomes" ADD CONSTRAINT "pricing_outcomes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "smart_pricing_decisions" ADD CONSTRAINT "smart_pricing_decisions_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
