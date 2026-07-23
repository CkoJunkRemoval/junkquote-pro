CREATE TABLE "pricing_profiles" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "defaultProfile" BOOLEAN NOT NULL DEFAULT false,
  "minimumCharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "tripFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "laborRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "dumpFee" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "mileageRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "fuelSurcharge" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "defaultCrewSize" INTEGER NOT NULL DEFAULT 1,
  "taxEnabled" BOOLEAN NOT NULL DEFAULT false,
  "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currency" TEXT NOT NULL DEFAULT 'USD',
  "displayOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "pricing_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "pricing_profiles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "pricing_profiles_nonnegative_check" CHECK (
    "minimumCharge" >= 0 AND "tripFee" >= 0 AND "laborRate" >= 0 AND
    "dumpFee" >= 0 AND "mileageRate" >= 0 AND "fuelSurcharge" >= 0
  ),
  CONSTRAINT "pricing_profiles_crew_size_check" CHECK ("defaultCrewSize" >= 1),
  CONSTRAINT "pricing_profiles_tax_rate_check" CHECK ("taxRate" >= 0 AND "taxRate" <= 100)
);

CREATE INDEX "pricing_profiles_companyId_idx" ON "pricing_profiles"("companyId");
CREATE INDEX "pricing_profiles_companyId_active_idx" ON "pricing_profiles"("companyId", "active");
CREATE INDEX "pricing_profiles_companyId_defaultProfile_idx" ON "pricing_profiles"("companyId", "defaultProfile");
CREATE UNIQUE INDEX "pricing_profiles_one_default_per_company"
  ON "pricing_profiles"("companyId") WHERE "defaultProfile" = true;
CREATE UNIQUE INDEX "pricing_profiles_active_name_unique"
  ON "pricing_profiles"("companyId", lower("name")) WHERE "active" = true;

INSERT INTO "pricing_profiles" (
  "id", "companyId", "name", "description", "active", "defaultProfile",
  "minimumCharge", "laborRate", "dumpFee", "taxEnabled", "taxRate",
  "currency", "displayOrder", "createdAt", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  c."id",
  'Standard',
  'Default pricing profile created during Pricing Engine v2 migration.',
  true,
  true,
  c."defaultMinimumCharge",
  COALESCE(s."defaultLaborRate", 0),
  COALESCE(s."defaultDumpFee", 0),
  c."defaultTaxRate" > 0,
  c."defaultTaxRate",
  c."currencyCode",
  0,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "companies" c
LEFT JOIN "company_settings" s ON s."companyId" = c."id";

ALTER TABLE "estimates" ADD COLUMN "pricingProfileId" TEXT;

UPDATE "estimates" e
SET "pricingProfileId" = p."id"
FROM "pricing_profiles" p
WHERE p."companyId" = e."companyId" AND p."defaultProfile" = true;

ALTER TABLE "estimates" ALTER COLUMN "pricingProfileId" SET NOT NULL;
ALTER TABLE "estimates"
  ADD CONSTRAINT "estimates_pricingProfileId_fkey"
  FOREIGN KEY ("pricingProfileId") REFERENCES "pricing_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "estimates_pricingProfileId_idx" ON "estimates"("pricingProfileId");
