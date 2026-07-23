ALTER TABLE "item_library"
  ADD COLUMN "estimateRequired" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "company_settings"
  ADD COLUMN "pricingRegion" TEXT,
  ADD COLUMN "pricingMarket" TEXT,
  ADD COLUMN "standardLibraryVersion" TEXT,
  ADD COLUMN "standardLibraryInitializedAt" TIMESTAMP(3);

-- Preserve customized companies. Only recognize legacy seed rows that still
-- have their original migration price; those rows can be reset explicitly
-- from Item Library settings after this migration.
UPDATE "item_library"
SET "estimateRequired" = true,
    "notes" = 'Estimator review required before quoting.'
WHERE lower("name") IN ('concrete', 'dirt', 'large brush pile', 'whole house cleanout', 'demolition', 'large shed', 'large deck');
