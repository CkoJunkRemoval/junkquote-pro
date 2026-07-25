ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'Onboarding';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'Leave';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'Suspended';
ALTER TYPE "EmployeeStatus" ADD VALUE IF NOT EXISTS 'Terminated';

CREATE TYPE "WorkerType" AS ENUM ('Employee', 'Contractor', 'Owner');
CREATE TYPE "CompensationType" AS ENUM ('Hourly', 'Salary', 'Commission', 'Mixed', 'OwnerDraw', 'Unpaid');
CREATE TYPE "WorkforceCredentialStatus" AS ENUM ('Valid', 'ExpiringSoon', 'Expired', 'Missing');
CREATE TYPE "WorkforceDocumentCategory" AS ENUM ('Onboarding', 'PolicyAcknowledgment', 'Certification', 'DriverDocument', 'Payroll', 'Tax', 'Performance', 'Disciplinary', 'Other');
CREATE TYPE "WorkforceOnboardingStatus" AS ENUM ('Pending', 'Completed', 'Waived');

ALTER TABLE "employees"
  ADD COLUMN "middleName" TEXT,
  ADD COLUMN "preferredName" TEXT,
  ADD COLUMN "employeeNumber" TEXT,
  ADD COLUMN "addressLine1" TEXT,
  ADD COLUMN "addressLine2" TEXT,
  ADD COLUMN "city" TEXT,
  ADD COLUMN "state" TEXT,
  ADD COLUMN "postalCode" TEXT,
  ADD COLUMN "workerType" "WorkerType" NOT NULL DEFAULT 'Employee',
  ADD COLUMN "jobTitle" TEXT,
  ADD COLUMN "department" TEXT,
  ADD COLUMN "hireDate" TIMESTAMP(3),
  ADD COLUMN "terminationDate" TIMESTAMP(3),
  ADD COLUMN "terminationReason" TEXT,
  ADD COLUMN "managerId" TEXT,
  ADD COLUMN "defaultCrewId" TEXT,
  ADD COLUMN "authorizedDriver" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "driverLicenseState" TEXT,
  ADD COLUMN "driverLicenseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "driverLicenseClass" TEXT,
  ADD COLUMN "drivingRestrictions" TEXT;

CREATE TABLE "workforce_compensation" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "compensationType" "CompensationType" NOT NULL,
  "hourlyRateCents" INTEGER,
  "annualSalaryCents" INTEGER,
  "commissionConfig" JSONB,
  "effectiveStartDate" TIMESTAMP(3) NOT NULL,
  "effectiveEndDate" TIMESTAMP(3),
  "overtimeEligible" BOOLEAN NOT NULL DEFAULT false,
  "notes" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_compensation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workforce_emergency_contacts" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "alternatePhone" TEXT,
  "priority" INTEGER NOT NULL DEFAULT 1,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_emergency_contacts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workforce_credentials" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "identifier" TEXT,
  "issuingOrganization" TEXT,
  "issuedDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "status" "WorkforceCredentialStatus" NOT NULL DEFAULT 'Valid',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_credentials_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workforce_documents" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "category" "WorkforceDocumentCategory" NOT NULL,
  "storageKey" TEXT NOT NULL,
  "displayFilename" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "effectiveDate" TIMESTAMP(3),
  "expirationDate" TIMESTAMP(3),
  "notes" TEXT,
  "credentialId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_documents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "workforce_onboarding_items" (
  "id" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "required" BOOLEAN NOT NULL DEFAULT true,
  "dueDate" TIMESTAMP(3),
  "status" "WorkforceOnboardingStatus" NOT NULL DEFAULT 'Pending',
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "documentId" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "workforce_onboarding_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employees_companyId_employeeNumber_key" ON "employees"("companyId", "employeeNumber");
CREATE INDEX "employees_companyId_status_idx" ON "employees"("companyId", "status");
CREATE INDEX "employees_companyId_workerType_idx" ON "employees"("companyId", "workerType");
CREATE INDEX "employees_companyId_authorizedDriver_idx" ON "employees"("companyId", "authorizedDriver");
CREATE INDEX "employees_managerId_idx" ON "employees"("managerId");
CREATE INDEX "employees_defaultCrewId_idx" ON "employees"("defaultCrewId");
CREATE INDEX "workforce_compensation_companyId_employeeId_effectiveStartDate_idx" ON "workforce_compensation"("companyId", "employeeId", "effectiveStartDate");
CREATE INDEX "workforce_compensation_companyId_effectiveEndDate_idx" ON "workforce_compensation"("companyId", "effectiveEndDate");
CREATE UNIQUE INDEX "workforce_emergency_contacts_employeeId_priority_key" ON "workforce_emergency_contacts"("employeeId", "priority");
CREATE INDEX "workforce_emergency_contacts_companyId_employeeId_idx" ON "workforce_emergency_contacts"("companyId", "employeeId");
CREATE INDEX "workforce_credentials_companyId_status_idx" ON "workforce_credentials"("companyId", "status");
CREATE INDEX "workforce_credentials_companyId_expirationDate_idx" ON "workforce_credentials"("companyId", "expirationDate");
CREATE INDEX "workforce_credentials_employeeId_idx" ON "workforce_credentials"("employeeId");
CREATE UNIQUE INDEX "workforce_documents_storageKey_key" ON "workforce_documents"("storageKey");
CREATE UNIQUE INDEX "workforce_documents_credentialId_key" ON "workforce_documents"("credentialId");
CREATE INDEX "workforce_documents_companyId_employeeId_category_idx" ON "workforce_documents"("companyId", "employeeId", "category");
CREATE INDEX "workforce_documents_companyId_expirationDate_idx" ON "workforce_documents"("companyId", "expirationDate");
CREATE INDEX "workforce_onboarding_items_companyId_employeeId_status_idx" ON "workforce_onboarding_items"("companyId", "employeeId", "status");
CREATE INDEX "workforce_onboarding_items_companyId_dueDate_idx" ON "workforce_onboarding_items"("companyId", "dueDate");

ALTER TABLE "employees" ADD CONSTRAINT "employees_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "employees" ADD CONSTRAINT "employees_defaultCrewId_fkey" FOREIGN KEY ("defaultCrewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workforce_compensation" ADD CONSTRAINT "workforce_compensation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_compensation" ADD CONSTRAINT "workforce_compensation_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_compensation" ADD CONSTRAINT "workforce_compensation_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_emergency_contacts" ADD CONSTRAINT "workforce_emergency_contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_emergency_contacts" ADD CONSTRAINT "workforce_emergency_contacts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_credentials" ADD CONSTRAINT "workforce_credentials_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_credentials" ADD CONSTRAINT "workforce_credentials_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_documents" ADD CONSTRAINT "workforce_documents_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "workforce_credentials"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workforce_onboarding_items" ADD CONSTRAINT "workforce_onboarding_items_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "workforce_onboarding_items" ADD CONSTRAINT "workforce_onboarding_items_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "workforce_onboarding_items" ADD CONSTRAINT "workforce_onboarding_items_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "workforce_onboarding_items" ADD CONSTRAINT "workforce_onboarding_items_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "workforce_documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
