"use server";

import { revalidatePath } from "next/cache";
import type {
  AssetAssignmentType,
  AssetCategory,
  AssetCondition,
  AssetDocumentCategory,
  AssetMileageSource,
  AssetOwnershipType,
  MaintenanceTriggerType,
} from "@/generated/prisma/client";
import { requireTenantContext } from "@/lib/auth/tenant";
import {
  requireFleetCapability,
  type FleetCapability,
} from "@/lib/fleet/permissions";
import * as fleet from "@/lib/fleet/service";
import { saveAssetDocument } from "@/lib/storage/assetDocumentStorage";

const text = (form: FormData, key: string) =>
  String(form.get(key) ?? "").trim();
const optional = (form: FormData, key: string) => text(form, key) || undefined;
const number = (form: FormData, key: string) => {
  const value = optional(form, key);
  return value === undefined ? undefined : Number(value);
};
const date = (form: FormData, key: string) => {
  const value = optional(form, key);
  return value ? new Date(value) : undefined;
};
const refresh = (assetId?: string) => {
  revalidatePath("/fleet");
  if (assetId) revalidatePath(`/fleet/${assetId}`);
};
async function context(capability: FleetCapability) {
  const tenant = await requireTenantContext();
  requireFleetCapability(tenant.role, capability);
  return tenant;
}

export async function createAssetAction(form: FormData) {
  const tenant = await context("fleet.manage");
  const asset = await fleet.createAsset(tenant.companyId, tenant.user.id, {
    assetNumber: text(form, "assetNumber"),
    name: text(form, "name"),
    category: text(form, "category") as AssetCategory,
    subtype: optional(form, "subtype"),
    make: optional(form, "make"),
    model: optional(form, "model"),
    modelYear: number(form, "modelYear"),
    serialNumber: optional(form, "serialNumber"),
    vin: optional(form, "vin"),
    licensePlate: optional(form, "licensePlate"),
    ownershipType: (optional(form, "ownershipType") ??
      "Owned") as AssetOwnershipType,
    condition: (optional(form, "condition") ?? "Unknown") as AssetCondition,
    purchaseDate: date(form, "purchaseDate"),
    purchasePriceCents:
      number(form, "purchasePrice") == null
        ? undefined
        : Math.round(Number(number(form, "purchasePrice")) * 100),
    notes: optional(form, "notes"),
  });
  refresh(asset.id);
}

export async function deleteUnusedAssetAction(
  assetId: string,
  confirmation: string,
) {
  const tenant = await context("fleet.remove");
  const result = await fleet.deleteUnusedAsset(
    tenant.companyId,
    tenant.user.id,
    assetId,
    confirmation,
  );
  refresh();
  return result;
}

export async function changeAssetLifecycleAction(
  assetId: string,
  status: fleet.AssetLifecycleStatus | "Available",
  reason: string,
) {
  const tenant = await context("fleet.remove");
  const result = await fleet.changeAssetLifecycle(
    tenant.companyId,
    tenant.user.id,
    assetId,
    status,
    reason,
  );
  refresh(assetId);
  return result;
}

export async function recordMileageAction(assetId: string, form: FormData) {
  const tenant = await context("fleet.mileage.log");
  await fleet.recordMileage(tenant.companyId, tenant.user.id, {
    assetId,
    odometerMiles: Number(text(form, "odometerMiles")),
    recordedAt: date(form, "recordedAt") ?? new Date(),
    source: (optional(form, "source") ?? "Manual") as AssetMileageSource,
    jobId: optional(form, "jobId"),
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}

export async function recordFuelAction(assetId: string, form: FormData) {
  const tenant = await context("fleet.fuel.log");
  await fleet.recordFuel(tenant.companyId, tenant.user.id, {
    assetId,
    transactionAt: date(form, "transactionAt") ?? new Date(),
    odometerMiles: number(form, "odometerMiles"),
    gallons: Number(text(form, "gallons")),
    totalCostCents: Math.round(Number(text(form, "totalCost")) * 100),
    pricePerGallonCents: Math.round(Number(text(form, "pricePerGallon")) * 100),
    fuelType: optional(form, "fuelType"),
    vendor: optional(form, "vendor"),
    paymentMethod: optional(form, "paymentMethod"),
    jobId: optional(form, "jobId"),
    fullTank: form.get("fullTank") === "on",
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}

export async function assignAssetAction(assetId: string, form: FormData) {
  const tenant = await context("fleet.assign");
  await fleet.assignAsset(tenant.companyId, tenant.user.id, {
    assetId,
    assigneeType: text(form, "assigneeType") as AssetAssignmentType,
    employeeId: optional(form, "employeeId"),
    crewId: optional(form, "crewId"),
    parentAssetId: optional(form, "parentAssetId"),
    jobId: optional(form, "jobId"),
    startingCondition: text(form, "startingCondition") as AssetCondition,
    startingOdometerMiles: number(form, "startingOdometerMiles"),
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}

export async function returnAssetAction(
  assetId: string,
  assignmentId: string,
  form: FormData,
) {
  const tenant = await context("fleet.assign");
  await fleet.returnAsset(tenant.companyId, tenant.user.id, assignmentId, {
    returnCondition: text(form, "returnCondition") as AssetCondition,
    endingOdometerMiles: number(form, "endingOdometerMiles"),
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}

export async function createMaintenanceScheduleAction(
  assetId: string,
  form: FormData,
) {
  const tenant = await context("fleet.maintenance.manage");
  await fleet.createMaintenanceSchedule(tenant.companyId, tenant.user.id, {
    assetId,
    serviceType: text(form, "serviceType"),
    triggerType: text(form, "triggerType") as MaintenanceTriggerType,
    intervalMiles: number(form, "intervalMiles"),
    intervalDays: number(form, "intervalDays"),
    dueOdometerMiles: number(form, "dueOdometerMiles"),
    dueDate: date(form, "dueDate"),
    warningLeadMiles: number(form, "warningLeadMiles"),
    warningLeadDays: number(form, "warningLeadDays"),
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}

export async function uploadAssetDocumentAction(
  assetId: string,
  form: FormData,
) {
  const tenant = await context("fleet.documents.manage");
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("Choose an asset document.");
  const stored = await saveAssetDocument(tenant.companyId, assetId, file);
  await fleet.createAssetDocument(tenant.companyId, tenant.user.id, {
    assetId,
    category: text(form, "category") as AssetDocumentCategory,
    storageKey: stored.storageKey,
    displayFilename: file.name,
    mimeType: file.type,
    sizeBytes: stored.sizeBytes,
    effectiveDate: date(form, "effectiveDate"),
    expirationDate: date(form, "expirationDate"),
    notes: optional(form, "notes"),
  });
  refresh(assetId);
}
