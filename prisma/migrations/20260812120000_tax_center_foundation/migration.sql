CREATE TYPE "TaxDocumentCategory" AS ENUM (
  'W9', 'W2Copy', 'Form1099Copy', 'BusinessLicense',
  'ResaleCertificate', 'InsuranceCertificate', 'CpaCorrespondence',
  'IrsCorrespondence', 'StateCorrespondence', 'TaxReturn',
  'EstimatedPaymentConfirmation', 'PayrollReport',
  'AccountantWorkpaper', 'Other'
);

CREATE TABLE "tax_documents" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "category" "TaxDocumentCategory" NOT NULL,
  "title" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "originalFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "reviewStatus" TEXT NOT NULL DEFAULT 'AwaitingReview',
  "uploadedById" TEXT NOT NULL,
  "reviewedById" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tax_checklist_items" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "taxYear" INTEGER NOT NULL,
  "key" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "isCustom" BOOLEAN NOT NULL DEFAULT false,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMP(3),
  "completedById" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tax_checklist_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tax_documents_storageKey_key" ON "tax_documents"("storageKey");
CREATE INDEX "tax_documents_companyId_taxYear_category_idx" ON "tax_documents"("companyId", "taxYear", "category");
CREATE INDEX "tax_documents_companyId_reviewStatus_createdAt_idx" ON "tax_documents"("companyId", "reviewStatus", "createdAt");
CREATE UNIQUE INDEX "tax_checklist_items_companyId_taxYear_key_key" ON "tax_checklist_items"("companyId", "taxYear", "key");
CREATE INDEX "tax_checklist_items_companyId_taxYear_completed_idx" ON "tax_checklist_items"("companyId", "taxYear", "completed");
ALTER TABLE "tax_documents" ADD CONSTRAINT "tax_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tax_checklist_items" ADD CONSTRAINT "tax_checklist_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
