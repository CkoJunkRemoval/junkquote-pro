ALTER TABLE "companies"
  ADD COLUMN "dbaName" TEXT,
  ADD COLUMN "ein" TEXT,
  ADD COLUMN "businessLicense" TEXT,
  ADD COLUMN "description" TEXT;

ALTER TABLE "company_settings"
  ADD COLUMN "lightLogoUrl" TEXT,
  ADD COLUMN "darkLogoUrl" TEXT,
  ADD COLUMN "emailBranding" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "estimateBranding" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "invoiceBranding" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "operationalDefaults" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN "integrationSettings" JSONB NOT NULL DEFAULT '{}';

CREATE TABLE "business_locations" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "managerId" TEXT,
  "hours" JSONB NOT NULL DEFAULT '{}',
  "active" BOOLEAN NOT NULL DEFAULT true,
  "fleetAssetIds" JSONB NOT NULL DEFAULT '[]',
  "employeeIds" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "business_locations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "business_locations_companyId_name_key" ON "business_locations"("companyId", "name");
CREATE INDEX "business_locations_companyId_active_idx" ON "business_locations"("companyId", "active");
ALTER TABLE "business_locations" ADD CONSTRAINT "business_locations_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "service_area_rules"
  ADD COLUMN "radiusMiles" DOUBLE PRECISION,
  ADD COLUMN "available" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "locationId" TEXT;
CREATE INDEX "service_area_rules_locationId_idx" ON "service_area_rules"("locationId");
ALTER TABLE "service_area_rules" ADD CONSTRAINT "service_area_rules_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "business_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "company_documents" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "objectKey" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "uploadedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "company_documents_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "company_documents_companyId_objectKey_key" ON "company_documents"("companyId", "objectKey");
CREATE INDEX "company_documents_companyId_category_createdAt_idx" ON "company_documents"("companyId", "category", "createdAt");
ALTER TABLE "company_documents" ADD CONSTRAINT "company_documents_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
