-- CreateEnum
CREATE TYPE "ExpenseReviewStatus" AS ENUM ('Draft', 'NeedsReview', 'Approved', 'Rejected', 'Voided');
CREATE TYPE "ExpenseSourceType" AS ENUM ('Manual', 'Fuel', 'Maintenance', 'AssetPurchase', 'DumpFee', 'Subscription', 'Import', 'System');
CREATE TYPE "ExpenseAllocationTarget" AS ENUM ('Job', 'Customer', 'Employee', 'Crew', 'Asset', 'Location', 'Department', 'AccountingClass');
CREATE TYPE "ExpenseDocumentCategory" AS ENUM ('Receipt', 'Invoice', 'CreditMemo', 'Statement', 'Contract', 'Warranty', 'TaxDocument', 'PaymentConfirmation', 'Other');
CREATE TYPE "RecurringExpenseCadence" AS ENUM ('Weekly', 'Biweekly', 'Monthly', 'Quarterly', 'Semiannually', 'Annually', 'Custom');
CREATE TYPE "FinancialPeriodStatus" AS ENUM ('Open', 'Review', 'Locked');

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "legalName" TEXT,
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "taxIdReference" TEXT,
    "accountNumberReference" TEXT,
    "paymentTerms" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "business_expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseNumber" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3) NOT NULL,
    "postingDate" TIMESTAMP(3),
    "vendorId" TEXT,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "tipCents" INTEGER NOT NULL DEFAULT 0,
    "feeCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" TEXT,
    "transactionReference" TEXT,
    "deductibleClassification" TEXT,
    "businessUsePercentage" INTEGER,
    "reviewStatus" "ExpenseReviewStatus" NOT NULL DEFAULT 'Draft',
    "reimbursementStatus" TEXT,
    "recurringExpenseId" TEXT,
    "sourceType" "ExpenseSourceType" NOT NULL DEFAULT 'Manual',
    "sourceRecordId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "voidReason" TEXT,
    "fuelEntryId" TEXT,
    "maintenanceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expense_allocations" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "targetType" "ExpenseAllocationTarget" NOT NULL,
    "jobId" TEXT,
    "customerId" TEXT,
    "employeeId" TEXT,
    "crewId" TEXT,
    "assetId" TEXT,
    "locationReference" TEXT,
    "departmentReference" TEXT,
    "accountingClass" TEXT,
    "allocatedAmountCents" INTEGER NOT NULL,
    "allocatedPercentage" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "expense_allocations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "finance_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "category" "ExpenseDocumentCategory" NOT NULL,
    "expenseId" TEXT,
    "vendorId" TEXT,
    "jobId" TEXT,
    "assetId" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "transactionDate" TIMESTAMP(3),
    "uploadedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "finance_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "recurring_expenses" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "vendorId" TEXT,
    "categoryId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "cadence" "RecurringExpenseCadence" NOT NULL,
    "customCadenceDays" INTEGER,
    "expectedAmountCents" INTEGER NOT NULL,
    "nextDueDate" TIMESTAMP(3) NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "autoCreateDraft" BOOLEAN NOT NULL DEFAULT false,
    "reminderLeadDays" INTEGER NOT NULL DEFAULT 7,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "paymentMethod" TEXT,
    "linkedAssetId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "recurring_expenses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "manual_income_adjustments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "manual_income_adjustments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "financial_periods" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" "FinancialPeriodStatus" NOT NULL DEFAULT 'Open',
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "unlockReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "financial_periods_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "expense_revisions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "revisionNumber" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "previousValues" JSONB NOT NULL,
    "revisedValues" JSONB NOT NULL,
    "correctedById" TEXT NOT NULL,
    "correctedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "expense_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_companyId_name_key" ON "expense_categories"("companyId", "name");
CREATE UNIQUE INDEX "expense_categories_companyId_code_key" ON "expense_categories"("companyId", "code");
CREATE INDEX "expense_categories_companyId_active_idx" ON "expense_categories"("companyId", "active");
CREATE INDEX "expense_categories_companyId_parentId_idx" ON "expense_categories"("companyId", "parentId");
CREATE UNIQUE INDEX "vendors_companyId_normalizedName_key" ON "vendors"("companyId", "normalizedName");
CREATE INDEX "vendors_companyId_name_idx" ON "vendors"("companyId", "name");
CREATE INDEX "vendors_companyId_type_active_idx" ON "vendors"("companyId", "type", "active");
CREATE UNIQUE INDEX "business_expenses_companyId_expenseNumber_key" ON "business_expenses"("companyId", "expenseNumber");
CREATE UNIQUE INDEX "business_expenses_companyId_sourceType_sourceRecordId_key" ON "business_expenses"("companyId", "sourceType", "sourceRecordId");
CREATE INDEX "business_expenses_companyId_transactionDate_idx" ON "business_expenses"("companyId", "transactionDate");
CREATE INDEX "business_expenses_companyId_reviewStatus_transactionDate_idx" ON "business_expenses"("companyId", "reviewStatus", "transactionDate");
CREATE INDEX "business_expenses_companyId_categoryId_idx" ON "business_expenses"("companyId", "categoryId");
CREATE INDEX "business_expenses_companyId_vendorId_idx" ON "business_expenses"("companyId", "vendorId");
CREATE INDEX "expense_allocations_companyId_expenseId_idx" ON "expense_allocations"("companyId", "expenseId");
CREATE INDEX "expense_allocations_companyId_targetType_idx" ON "expense_allocations"("companyId", "targetType");
CREATE INDEX "expense_allocations_companyId_jobId_idx" ON "expense_allocations"("companyId", "jobId");
CREATE INDEX "expense_allocations_companyId_customerId_idx" ON "expense_allocations"("companyId", "customerId");
CREATE INDEX "expense_allocations_companyId_employeeId_idx" ON "expense_allocations"("companyId", "employeeId");
CREATE INDEX "expense_allocations_companyId_crewId_idx" ON "expense_allocations"("companyId", "crewId");
CREATE INDEX "expense_allocations_companyId_assetId_idx" ON "expense_allocations"("companyId", "assetId");
CREATE UNIQUE INDEX "finance_documents_storageKey_key" ON "finance_documents"("storageKey");
CREATE INDEX "finance_documents_companyId_category_createdAt_idx" ON "finance_documents"("companyId", "category", "createdAt");
CREATE INDEX "finance_documents_companyId_expenseId_idx" ON "finance_documents"("companyId", "expenseId");
CREATE INDEX "finance_documents_companyId_vendorId_idx" ON "finance_documents"("companyId", "vendorId");
CREATE INDEX "finance_documents_companyId_jobId_idx" ON "finance_documents"("companyId", "jobId");
CREATE INDEX "finance_documents_companyId_assetId_idx" ON "finance_documents"("companyId", "assetId");
CREATE INDEX "recurring_expenses_companyId_active_nextDueDate_idx" ON "recurring_expenses"("companyId", "active", "nextDueDate");
CREATE INDEX "recurring_expenses_companyId_categoryId_idx" ON "recurring_expenses"("companyId", "categoryId");
CREATE INDEX "manual_income_adjustments_companyId_effectiveDate_idx" ON "manual_income_adjustments"("companyId", "effectiveDate");
CREATE UNIQUE INDEX "financial_periods_companyId_startDate_endDate_key" ON "financial_periods"("companyId", "startDate", "endDate");
CREATE INDEX "financial_periods_companyId_status_startDate_idx" ON "financial_periods"("companyId", "status", "startDate");
CREATE UNIQUE INDEX "expense_revisions_expenseId_revisionNumber_key" ON "expense_revisions"("expenseId", "revisionNumber");
CREATE INDEX "expense_revisions_companyId_correctedAt_idx" ON "expense_revisions"("companyId", "correctedAt");

-- AddForeignKey
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_categories" ADD CONSTRAINT "expense_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_recurringExpenseId_fkey" FOREIGN KEY ("recurringExpenseId") REFERENCES "recurring_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_fuelEntryId_fkey" FOREIGN KEY ("fuelEntryId") REFERENCES "fuel_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "business_expenses" ADD CONSTRAINT "business_expenses_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "asset_maintenance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "business_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_allocations" ADD CONSTRAINT "expense_allocations_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "business_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "finance_documents" ADD CONSTRAINT "finance_documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_linkedAssetId_fkey" FOREIGN KEY ("linkedAssetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "manual_income_adjustments" ADD CONSTRAINT "manual_income_adjustments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "financial_periods" ADD CONSTRAINT "financial_periods_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "expense_revisions" ADD CONSTRAINT "expense_revisions_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "business_expenses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
