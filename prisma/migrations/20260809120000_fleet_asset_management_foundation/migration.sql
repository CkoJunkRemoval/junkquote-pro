-- CreateEnum
CREATE TYPE "AssetCategory" AS ENUM ('Vehicle', 'Trailer', 'PoweredEquipment', 'NonPoweredEquipment', 'Tool', 'SafetyEquipment', 'Electronics', 'Container', 'Other');

-- CreateEnum
CREATE TYPE "AssetOwnershipType" AS ENUM ('Owned', 'Financed', 'Leased', 'Rented');

-- CreateEnum
CREATE TYPE "AssetCondition" AS ENUM ('Excellent', 'Good', 'Fair', 'Poor', 'Damaged', 'Unknown');

-- CreateEnum
CREATE TYPE "AssetAssignmentType" AS ENUM ('Employee', 'Crew', 'ParentAsset', 'Job');

-- CreateEnum
CREATE TYPE "AssetMileageSource" AS ENUM ('Daily', 'Weekly', 'Fuel', 'Service', 'Job', 'Manual', 'Import', 'System');

-- CreateEnum
CREATE TYPE "MaintenanceTriggerType" AS ENUM ('Mileage', 'Date', 'EngineHours', 'UsageCount', 'CombinedMileageOrDate');

-- CreateEnum
CREATE TYPE "AssetInspectionResult" AS ENUM ('Passed', 'PassedWithDefects', 'Failed');

-- CreateEnum
CREATE TYPE "InspectionItemResult" AS ENUM ('Pass', 'Fail', 'NotApplicable');

-- CreateEnum
CREATE TYPE "InspectionDefectStatus" AS ENUM ('Open', 'Resolved', 'Deferred');

-- CreateEnum
CREATE TYPE "AssetTimelineEventType" AS ENUM ('Created', 'Purchased', 'Assigned', 'Returned', 'Transferred', 'MileageRecorded', 'Fueled', 'ServiceScheduled', 'ServiceCompleted', 'InspectionCompleted', 'DefectReported', 'StatusChanged', 'DocumentAdded', 'AccidentReported', 'Sold', 'Retired', 'Lost', 'Stolen');

-- CreateEnum
CREATE TYPE "AssetDocumentCategory" AS ENUM ('PurchaseReceipt', 'Title', 'Registration', 'Insurance', 'Inspection', 'ServiceInvoice', 'FuelReceipt', 'Warranty', 'Financing', 'Lease', 'RentalAgreement', 'AccidentReport', 'Photo', 'Other');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FleetAssetStatus" ADD VALUE 'Available';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'Assigned';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'InService';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'Repair';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'Sold';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'Lost';
ALTER TYPE "FleetAssetStatus" ADD VALUE 'Stolen';

-- AlterTable
ALTER TABLE "fleet_assets" ADD COLUMN     "assetNumber" TEXT,
ADD COLUMN     "assignedCrewId" TEXT,
ADD COLUMN     "assignedEmployeeId" TEXT,
ADD COLUMN     "category" "AssetCategory" NOT NULL DEFAULT 'Other',
ADD COLUMN     "condition" "AssetCondition" NOT NULL DEFAULT 'Unknown',
ADD COLUMN     "make" TEXT,
ADD COLUMN     "model" TEXT,
ADD COLUMN     "modelYear" INTEGER,
ADD COLUMN     "ownershipType" "AssetOwnershipType" NOT NULL DEFAULT 'Owned',
ADD COLUMN     "parentAssetId" TEXT,
ADD COLUMN     "purchaseDate" TIMESTAMP(3),
ADD COLUMN     "purchasePriceCents" INTEGER,
ADD COLUMN     "replacementValueCents" INTEGER,
ADD COLUMN     "serialNumber" TEXT,
ADD COLUMN     "subtype" TEXT,
ADD COLUMN     "warrantyExpiresAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "company_fleet_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "missingMileageDays" INTEGER NOT NULL DEFAULT 7,
    "unusualMpgVariancePct" INTEGER NOT NULL DEFAULT 35,
    "documentWarningDays" INTEGER NOT NULL DEFAULT 30,
    "maintenanceWarningDays" INTEGER NOT NULL DEFAULT 30,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_fleet_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_profiles" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "plateState" TEXT,
    "titleStatus" TEXT,
    "trim" TEXT,
    "fuelType" TEXT,
    "tankCapacityGallons" DOUBLE PRECISION,
    "grossVehicleWeightRatingPounds" INTEGER,
    "towingCapacityPounds" INTEGER,
    "initialOdometerMiles" INTEGER,
    "serviceMileageBaseline" INTEGER,
    "purchaseMileage" INTEGER,
    "registrationExpiration" TIMESTAMP(3),
    "insuranceExpiration" TIMESTAMP(3),
    "annualInspectionExpiration" TIMESTAMP(3),
    "emissionsExpiration" TIMESTAMP(3),
    "vehicleClass" TEXT,
    "dotRequired" BOOLEAN NOT NULL DEFAULT false,
    "outOfServiceReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trailer_profiles" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "registrationExpiration" TIMESTAMP(3),
    "trailerType" TEXT,
    "axleCount" INTEGER,
    "emptyWeightPounds" INTEGER,
    "grossVehicleWeightRatingPounds" INTEGER,
    "payloadCapacityPounds" INTEGER,
    "bedLengthFeet" DOUBLE PRECISION,
    "bedWidthFeet" DOUBLE PRECISION,
    "cubicYardCapacity" DOUBLE PRECISION,
    "brakeType" TEXT,
    "inspectionExpiration" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trailer_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_assignments" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "assigneeType" "AssetAssignmentType" NOT NULL,
    "employeeId" TEXT,
    "crewId" TEXT,
    "parentAssetId" TEXT,
    "jobId" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "returnedAt" TIMESTAMP(3),
    "assignedById" TEXT NOT NULL,
    "returnedById" TEXT,
    "startingCondition" "AssetCondition" NOT NULL,
    "returnCondition" "AssetCondition",
    "startingOdometerMiles" INTEGER,
    "endingOdometerMiles" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_mileage_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "odometerMiles" INTEGER NOT NULL,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" "AssetMileageSource" NOT NULL,
    "employeeId" TEXT,
    "jobId" TEXT,
    "fuelEntryId" TEXT,
    "maintenanceRecordId" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "originalEntryId" TEXT,
    "correctionReason" TEXT,
    "correctedById" TEXT,
    "correctedAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_mileage_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fuel_entries" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "employeeId" TEXT,
    "transactionAt" TIMESTAMP(3) NOT NULL,
    "odometerMiles" INTEGER,
    "gallons" DOUBLE PRECISION NOT NULL,
    "totalCostCents" INTEGER NOT NULL,
    "pricePerGallonCents" INTEGER NOT NULL,
    "fuelType" TEXT,
    "vendor" TEXT,
    "paymentMethod" TEXT,
    "jobId" TEXT,
    "fullTank" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fuel_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_schedules" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "serviceType" TEXT NOT NULL,
    "triggerType" "MaintenanceTriggerType" NOT NULL,
    "intervalMiles" INTEGER,
    "intervalDays" INTEGER,
    "dueOdometerMiles" INTEGER,
    "dueDate" TIMESTAMP(3),
    "lastCompletedAt" TIMESTAMP(3),
    "lastCompletedOdometer" INTEGER,
    "warningLeadMiles" INTEGER NOT NULL DEFAULT 500,
    "warningLeadDays" INTEGER NOT NULL DEFAULT 30,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_maintenance_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "scheduleId" TEXT,
    "serviceType" TEXT NOT NULL,
    "serviceDate" TIMESTAMP(3) NOT NULL,
    "odometerMiles" INTEGER,
    "vendor" TEXT,
    "description" TEXT NOT NULL,
    "laborCostCents" INTEGER NOT NULL DEFAULT 0,
    "partsCostCents" INTEGER NOT NULL DEFAULT 0,
    "taxCostCents" INTEGER NOT NULL DEFAULT 0,
    "totalCostCents" INTEGER NOT NULL DEFAULT 0,
    "performedByEmployeeId" TEXT,
    "warrantyWork" BOOLEAN NOT NULL DEFAULT false,
    "downtimeStartedAt" TIMESTAMP(3),
    "downtimeEndedAt" TIMESTAMP(3),
    "invoiceNumber" TEXT,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_maintenance_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "AssetCategory",
    "inspectionType" TEXT NOT NULL,
    "sections" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_records" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "templateId" TEXT,
    "inspectorEmployeeId" TEXT NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "odometerMiles" INTEGER,
    "result" "AssetInspectionResult" NOT NULL,
    "checklistResults" JSONB NOT NULL,
    "notes" TEXT,
    "acknowledgedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_defects" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "inspectionRecordId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "checklistItemKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "outOfServiceTrigger" BOOLEAN NOT NULL DEFAULT false,
    "status" "InspectionDefectStatus" NOT NULL DEFAULT 'Open',
    "resolvedAt" TIMESTAMP(3),
    "resolutionNotes" TEXT,
    "maintenanceRecordId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspection_defects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "category" "AssetDocumentCategory" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "displayFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "effectiveDate" TIMESTAMP(3),
    "expirationDate" TIMESTAMP(3),
    "fuelEntryId" TEXT,
    "maintenanceRecordId" TEXT,
    "inspectionRecordId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "asset_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset_timeline_events" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "eventType" "AssetTimelineEventType" NOT NULL,
    "sourceType" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asset_timeline_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "company_fleet_settings_companyId_key" ON "company_fleet_settings"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_profiles_assetId_key" ON "vehicle_profiles"("assetId");

-- CreateIndex
CREATE INDEX "vehicle_profiles_registrationExpiration_idx" ON "vehicle_profiles"("registrationExpiration");

-- CreateIndex
CREATE UNIQUE INDEX "trailer_profiles_assetId_key" ON "trailer_profiles"("assetId");

-- CreateIndex
CREATE INDEX "trailer_profiles_registrationExpiration_idx" ON "trailer_profiles"("registrationExpiration");

-- CreateIndex
CREATE INDEX "trailer_profiles_inspectionExpiration_idx" ON "trailer_profiles"("inspectionExpiration");

-- CreateIndex
CREATE INDEX "asset_assignments_companyId_assetId_returnedAt_idx" ON "asset_assignments"("companyId", "assetId", "returnedAt");

-- CreateIndex
CREATE INDEX "asset_assignments_companyId_employeeId_returnedAt_idx" ON "asset_assignments"("companyId", "employeeId", "returnedAt");

-- CreateIndex
CREATE INDEX "asset_assignments_companyId_crewId_returnedAt_idx" ON "asset_assignments"("companyId", "crewId", "returnedAt");

-- CreateIndex
CREATE INDEX "asset_assignments_companyId_parentAssetId_returnedAt_idx" ON "asset_assignments"("companyId", "parentAssetId", "returnedAt");

-- CreateIndex
CREATE INDEX "asset_assignments_companyId_jobId_returnedAt_idx" ON "asset_assignments"("companyId", "jobId", "returnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_mileage_entries_fuelEntryId_key" ON "asset_mileage_entries"("fuelEntryId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_mileage_entries_maintenanceRecordId_key" ON "asset_mileage_entries"("maintenanceRecordId");

-- CreateIndex
CREATE INDEX "asset_mileage_entries_companyId_assetId_recordedAt_idx" ON "asset_mileage_entries"("companyId", "assetId", "recordedAt");

-- CreateIndex
CREATE INDEX "asset_mileage_entries_companyId_odometerMiles_idx" ON "asset_mileage_entries"("companyId", "odometerMiles");

-- CreateIndex
CREATE INDEX "asset_mileage_entries_originalEntryId_idx" ON "asset_mileage_entries"("originalEntryId");

-- CreateIndex
CREATE INDEX "fuel_entries_companyId_assetId_transactionAt_idx" ON "fuel_entries"("companyId", "assetId", "transactionAt");

-- CreateIndex
CREATE INDEX "fuel_entries_companyId_employeeId_transactionAt_idx" ON "fuel_entries"("companyId", "employeeId", "transactionAt");

-- CreateIndex
CREATE INDEX "fuel_entries_companyId_jobId_transactionAt_idx" ON "fuel_entries"("companyId", "jobId", "transactionAt");

-- CreateIndex
CREATE INDEX "maintenance_schedules_companyId_active_dueDate_idx" ON "maintenance_schedules"("companyId", "active", "dueDate");

-- CreateIndex
CREATE INDEX "maintenance_schedules_companyId_active_dueOdometerMiles_idx" ON "maintenance_schedules"("companyId", "active", "dueOdometerMiles");

-- CreateIndex
CREATE INDEX "maintenance_schedules_assetId_serviceType_idx" ON "maintenance_schedules"("assetId", "serviceType");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_companyId_assetId_serviceDate_idx" ON "asset_maintenance_records"("companyId", "assetId", "serviceDate");

-- CreateIndex
CREATE INDEX "asset_maintenance_records_companyId_scheduleId_idx" ON "asset_maintenance_records"("companyId", "scheduleId");

-- CreateIndex
CREATE INDEX "inspection_templates_companyId_active_idx" ON "inspection_templates"("companyId", "active");

-- CreateIndex
CREATE INDEX "inspection_records_companyId_assetId_inspectedAt_idx" ON "inspection_records"("companyId", "assetId", "inspectedAt");

-- CreateIndex
CREATE INDEX "inspection_records_companyId_result_inspectedAt_idx" ON "inspection_records"("companyId", "result", "inspectedAt");

-- CreateIndex
CREATE INDEX "inspection_defects_companyId_assetId_status_idx" ON "inspection_defects"("companyId", "assetId", "status");

-- CreateIndex
CREATE INDEX "inspection_defects_inspectionRecordId_idx" ON "inspection_defects"("inspectionRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "asset_documents_storageKey_key" ON "asset_documents"("storageKey");

-- CreateIndex
CREATE INDEX "asset_documents_companyId_assetId_category_idx" ON "asset_documents"("companyId", "assetId", "category");

-- CreateIndex
CREATE INDEX "asset_documents_companyId_expirationDate_idx" ON "asset_documents"("companyId", "expirationDate");

-- CreateIndex
CREATE INDEX "asset_timeline_events_companyId_assetId_occurredAt_idx" ON "asset_timeline_events"("companyId", "assetId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "asset_timeline_events_companyId_sourceType_sourceId_eventTy_key" ON "asset_timeline_events"("companyId", "sourceType", "sourceId", "eventType");

-- CreateIndex
CREATE INDEX "fleet_assets_companyId_category_status_idx" ON "fleet_assets"("companyId", "category", "status");

-- CreateIndex
CREATE INDEX "fleet_assets_companyId_vin_idx" ON "fleet_assets"("companyId", "vin");

-- CreateIndex
CREATE INDEX "fleet_assets_companyId_serialNumber_idx" ON "fleet_assets"("companyId", "serialNumber");

-- CreateIndex
CREATE INDEX "fleet_assets_assignedEmployeeId_idx" ON "fleet_assets"("assignedEmployeeId");

-- CreateIndex
CREATE INDEX "fleet_assets_assignedCrewId_idx" ON "fleet_assets"("assignedCrewId");

-- CreateIndex
CREATE INDEX "fleet_assets_parentAssetId_idx" ON "fleet_assets"("parentAssetId");

-- CreateIndex
CREATE UNIQUE INDEX "fleet_assets_companyId_assetNumber_key" ON "fleet_assets"("companyId", "assetNumber");

-- AddForeignKey
ALTER TABLE "fleet_assets" ADD CONSTRAINT "fleet_assets_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_assets" ADD CONSTRAINT "fleet_assets_assignedCrewId_fkey" FOREIGN KEY ("assignedCrewId") REFERENCES "crews"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fleet_assets" ADD CONSTRAINT "fleet_assets_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "fleet_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_fleet_settings" ADD CONSTRAINT "company_fleet_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_profiles" ADD CONSTRAINT "vehicle_profiles_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trailer_profiles" ADD CONSTRAINT "trailer_profiles_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "crews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_assignments" ADD CONSTRAINT "asset_assignments_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_originalEntryId_fkey" FOREIGN KEY ("originalEntryId") REFERENCES "asset_mileage_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_correctedById_fkey" FOREIGN KEY ("correctedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_fuelEntryId_fkey" FOREIGN KEY ("fuelEntryId") REFERENCES "fuel_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_mileage_entries" ADD CONSTRAINT "asset_mileage_entries_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "asset_maintenance_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "jobs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fuel_entries" ADD CONSTRAINT "fuel_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_schedules" ADD CONSTRAINT "maintenance_schedules_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "maintenance_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_performedByEmployeeId_fkey" FOREIGN KEY ("performedByEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_maintenance_records" ADD CONSTRAINT "asset_maintenance_records_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_templates" ADD CONSTRAINT "inspection_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "inspection_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_records" ADD CONSTRAINT "inspection_records_inspectorEmployeeId_fkey" FOREIGN KEY ("inspectorEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defects" ADD CONSTRAINT "inspection_defects_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defects" ADD CONSTRAINT "inspection_defects_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defects" ADD CONSTRAINT "inspection_defects_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_defects" ADD CONSTRAINT "inspection_defects_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "asset_maintenance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_fuelEntryId_fkey" FOREIGN KEY ("fuelEntryId") REFERENCES "fuel_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_maintenanceRecordId_fkey" FOREIGN KEY ("maintenanceRecordId") REFERENCES "asset_maintenance_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_inspectionRecordId_fkey" FOREIGN KEY ("inspectionRecordId") REFERENCES "inspection_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_documents" ADD CONSTRAINT "asset_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "fleet_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "asset_timeline_events" ADD CONSTRAINT "asset_timeline_events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
