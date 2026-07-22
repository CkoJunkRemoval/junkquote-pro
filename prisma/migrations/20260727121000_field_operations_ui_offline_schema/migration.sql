ALTER TABLE "job_photos"
  ADD COLUMN "annotationMetadata" JSONB,
  ADD COLUMN "clientOperationId" TEXT,
  ADD COLUMN "originalPhotoId" TEXT;
CREATE UNIQUE INDEX "job_photos_companyId_clientOperationId_key" ON "job_photos"("companyId", "clientOperationId");
CREATE INDEX "job_photos_originalPhotoId_idx" ON "job_photos"("originalPhotoId");
ALTER TABLE "job_photos" ADD CONSTRAINT "job_photos_originalPhotoId_fkey" FOREIGN KEY ("originalPhotoId") REFERENCES "job_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "field_change_orders"
  ALTER COLUMN "status" SET DEFAULT 'Submitted',
  ADD COLUMN "originalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  ADD COLUMN "managerNote" TEXT,
  ADD COLUMN "requiresCustomerApproval" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "managerReviewedAt" TIMESTAMP(3);
UPDATE "field_change_orders" SET "status" = 'Submitted' WHERE "status" = 'Pending';

ALTER TABLE "disposal_records"
  ADD COLUMN "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "weightUnit" TEXT NOT NULL DEFAULT 'lb',
  ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'Other',
  ADD COLUMN "createdByEmployeeId" TEXT,
  ADD COLUMN "correctedAt" TIMESTAMP(3),
  ADD COLUMN "correctionNote" TEXT;
