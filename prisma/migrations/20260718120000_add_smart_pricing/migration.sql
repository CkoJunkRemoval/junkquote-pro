ALTER TABLE "company_settings" ADD COLUMN "smartPricingEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "smartPricingMinimumSampleSize" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN "smartPricingConfidenceThreshold" INTEGER NOT NULL DEFAULT 60,
ADD COLUMN "smartPricingUseLaborHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "smartPricingUseDisposalHistory" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "smartPricingUseTravelHistory" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "pricing_history" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "estimateId" TEXT NOT NULL, "jobId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL, "area" TEXT NOT NULL, "item" TEXT NOT NULL, "quantity" INTEGER NOT NULL,
  "cubicYards" DOUBLE PRECISION NOT NULL, "laborHours" DOUBLE PRECISION NOT NULL, "disposalCost" DOUBLE PRECISION NOT NULL,
  "dumpFees" DOUBLE PRECISION NOT NULL, "travelDistance" DOUBLE PRECISION, "travelTime" DOUBLE PRECISION,
  "finalQuotedPrice" DOUBLE PRECISION NOT NULL, "finalCollectedPrice" DOUBLE PRECISION NOT NULL,
  "discount" DOUBLE PRECISION NOT NULL, "profitEstimate" DOUBLE PRECISION NOT NULL, "propertyType" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, CONSTRAINT "pricing_history_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "smart_pricing_decisions" (
  "id" TEXT NOT NULL, "companyId" TEXT NOT NULL, "estimateId" TEXT NOT NULL, "recommendedPrice" DOUBLE PRECISION NOT NULL,
  "confidenceScore" INTEGER NOT NULL, "historicalSampleSize" INTEGER NOT NULL, "manualPrice" DOUBLE PRECISION NOT NULL,
  "appliedPrice" DOUBLE PRECISION, "accepted" BOOLEAN, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL, CONSTRAINT "smart_pricing_decisions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "pricing_history_jobId_item_area_key" ON "pricing_history"("jobId", "item", "area");
CREATE INDEX "pricing_history_companyId_item_createdAt_idx" ON "pricing_history"("companyId", "item", "createdAt");
CREATE INDEX "pricing_history_companyId_createdAt_idx" ON "pricing_history"("companyId", "createdAt");
CREATE UNIQUE INDEX "smart_pricing_decisions_estimateId_key" ON "smart_pricing_decisions"("estimateId");
CREATE INDEX "smart_pricing_decisions_companyId_createdAt_idx" ON "smart_pricing_decisions"("companyId", "createdAt");
ALTER TABLE "pricing_history" ADD CONSTRAINT "pricing_history_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_history" ADD CONSTRAINT "pricing_history_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "pricing_history" ADD CONSTRAINT "pricing_history_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smart_pricing_decisions" ADD CONSTRAINT "smart_pricing_decisions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "smart_pricing_decisions" ADD CONSTRAINT "smart_pricing_decisions_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "estimates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
