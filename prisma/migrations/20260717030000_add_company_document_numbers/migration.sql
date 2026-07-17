-- Preserve existing numeric identifiers while assigning prefixed display identifiers to new documents.
ALTER TABLE "estimates" ADD COLUMN "displayNumber" TEXT;
ALTER TABLE "invoices" ADD COLUMN "displayNumber" TEXT;

CREATE UNIQUE INDEX "estimates_displayNumber_key" ON "estimates"("displayNumber");
CREATE UNIQUE INDEX "invoices_displayNumber_key" ON "invoices"("displayNumber");
