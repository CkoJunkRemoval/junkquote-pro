CREATE TYPE "CompanyClassification" AS ENUM ('CUSTOMER', 'TEST', 'INTERNAL');

ALTER TABLE "companies"
  ADD COLUMN "classification" "CompanyClassification" NOT NULL DEFAULT 'CUSTOMER',
  ADD COLUMN "suspendedAt" TIMESTAMP(3),
  ADD COLUMN "suspendedReason" TEXT;

CREATE INDEX "companies_classification_active_createdAt_idx" ON "companies"("classification", "active", "createdAt");

CREATE TABLE "platform_company_deletion_tombstones" (
  "id" TEXT NOT NULL,
  "deletedCompanyId" TEXT NOT NULL,
  "companyName" TEXT NOT NULL,
  "classification" "CompanyClassification" NOT NULL,
  "deletedByUserId" TEXT,
  "reason" TEXT NOT NULL,
  "safeCounts" JSONB NOT NULL,
  "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "platform_company_deletion_tombstones_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "platform_company_deletion_tombstones_deletedCompanyId_deletedAt_idx" ON "platform_company_deletion_tombstones"("deletedCompanyId", "deletedAt");
