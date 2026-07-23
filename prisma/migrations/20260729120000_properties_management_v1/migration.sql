ALTER TABLE "properties"
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "country" TEXT NOT NULL DEFAULT 'US',
  ADD COLUMN "normalizedAddress" TEXT,
  ADD COLUMN "latitude" DOUBLE PRECISION,
  ADD COLUMN "longitude" DOUBLE PRECISION,
  ADD COLUMN "hazardNotes" TEXT,
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "serviceArea" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "archivedAt" TIMESTAMP(3);

UPDATE "properties"
SET "normalizedAddress" = lower(regexp_replace(trim(concat_ws(' ', "address", "city", "state", "zip", 'US')), '\s+', ' ', 'g'))
WHERE "normalizedAddress" IS NULL;

CREATE INDEX "properties_customerId_active_idx" ON "properties"("customerId", "active");
CREATE INDEX "properties_normalizedAddress_idx" ON "properties"("normalizedAddress");
CREATE INDEX "properties_city_idx" ON "properties"("city");
