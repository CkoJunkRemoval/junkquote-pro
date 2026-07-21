ALTER TABLE "company_settings"
ADD COLUMN "serviceRadiusMiles" DOUBLE PRECISION NOT NULL DEFAULT 25,
ADD COLUMN "defaultLaborRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "defaultDumpFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "heavyItemSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "appliancePrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "yardDebrisPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "constructionDebrisPrice" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN "approvalExpirationDays" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN "dateFormat" TEXT NOT NULL DEFAULT 'MM/DD/YYYY',
ADD COLUMN "communicationSenderName" TEXT,
ADD COLUMN "communicationReplyTo" TEXT,
ADD COLUMN "estimateEmailTemplate" TEXT,
ADD COLUMN "invoiceEmailTemplate" TEXT,
ADD COLUMN "approvalEmailTemplate" TEXT,
ADD COLUMN "pdfBrandingEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "portalBrandingEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "company_settings" ADD COLUMN "itemLibraryDefaults" JSONB;

CREATE TABLE "company_onboarding" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "currentStep" INTEGER NOT NULL DEFAULT 1,
  "completedSections" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "skippedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "dismissedAt" TIMESTAMP(3),
  "demoDataIds" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_onboarding_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "company_onboarding_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "company_onboarding_companyId_key" ON "company_onboarding"("companyId");

CREATE TABLE "service_area_rules" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "travelZone" TEXT,
  "distanceCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "service_area_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "service_area_rules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "service_area_rules_companyId_kind_value_key" ON "service_area_rules"("companyId","kind","value");
CREATE INDEX "service_area_rules_companyId_travelZone_idx" ON "service_area_rules"("companyId","travelZone");
