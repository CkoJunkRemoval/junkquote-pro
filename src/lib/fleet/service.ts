import "server-only";
import type {
  AssetAssignmentType,
  AssetCategory,
  AssetCondition,
  AssetDocumentCategory,
  AssetMileageSource,
  AssetOwnershipType,
  FleetAssetStatus,
  FleetAssetType,
  MaintenanceTriggerType,
  Prisma,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  assertNoRecursiveParent,
  deriveFuelMetrics,
  maintenanceStatus,
  validateFuelConsistency,
} from "./calculations";

type Tx = Prisma.TransactionClient;
const blockedStatuses: FleetAssetStatus[] = [
  "Retired",
  "Sold",
  "Lost",
  "Stolen",
];

function legacyType(category: AssetCategory): FleetAssetType {
  if (category === "Vehicle") return "Truck";
  if (category === "Trailer") return "Trailer";
  if (["PoweredEquipment", "NonPoweredEquipment", "Tool"].includes(category))
    return "Equipment";
  return "Other";
}

async function timeline(
  tx: Tx,
  input: {
    companyId: string;
    assetId: string;
    eventType:
      | "Created"
      | "Assigned"
      | "Returned"
      | "Transferred"
      | "MileageRecorded"
      | "Fueled"
      | "ServiceScheduled"
      | "ServiceCompleted"
      | "InspectionCompleted"
      | "DefectReported"
      | "StatusChanged"
      | "DocumentAdded"
      | "Sold"
      | "Retired"
      | "Lost"
      | "Stolen";
    sourceType: string;
    sourceId: string;
    occurredAt?: Date;
    createdById?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return tx.assetTimelineEvent.create({
    data: {
      ...input,
      occurredAt: input.occurredAt ?? new Date(),
    },
  });
}

async function audit(
  tx: Tx,
  companyId: string,
  userId: string,
  eventType: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue,
) {
  await tx.auditEvent.create({
    data: {
      companyId,
      actingUserId: userId,
      eventType,
      entityType,
      entityId,
      metadata,
    },
  });
}

async function notifyOnce(
  tx: Tx,
  input: {
    companyId: string;
    title: string;
    body: string;
    sourceType: string;
    sourceId: string;
    link?: string;
  },
) {
  const duplicate = await tx.systemNotification.findFirst({
    where: {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      title: input.title,
      createdAt: { gte: new Date(Date.now() - 86_400_000) },
    },
    select: { id: true },
  });
  if (!duplicate)
    await tx.systemNotification.create({
      data: { ...input, channel: "in-app" },
    });
}

export type CreateAssetInput = {
  assetNumber: string;
  name: string;
  category: AssetCategory;
  subtype?: string;
  make?: string;
  model?: string;
  modelYear?: number;
  serialNumber?: string;
  vin?: string;
  licensePlate?: string;
  ownershipType?: AssetOwnershipType;
  condition?: AssetCondition;
  purchaseDate?: Date;
  purchasePriceCents?: number;
  replacementValueCents?: number;
  parentAssetId?: string;
  notes?: string;
};

export async function createAsset(
  companyId: string,
  userId: string,
  input: CreateAssetInput,
) {
  if (!input.assetNumber.trim() || !input.name.trim())
    throw new Error("Asset number and display name are required.");
  return prisma.$transaction(async (tx) => {
    if (
      input.parentAssetId &&
      !(await tx.fleetAsset.findFirst({
        where: { id: input.parentAssetId, companyId },
        select: { id: true },
      }))
    )
      throw new Error("Parent asset not found.");
    const asset = await tx.fleetAsset.create({
      data: {
        companyId,
        type: legacyType(input.category),
        assetNumber: input.assetNumber.trim(),
        name: input.name.trim(),
        category: input.category,
        subtype: input.subtype?.trim() || null,
        make: input.make?.trim() || null,
        model: input.model?.trim() || null,
        modelYear: input.modelYear,
        serialNumber: input.serialNumber?.trim() || null,
        vin: input.vin?.trim().toUpperCase() || null,
        licensePlate: input.licensePlate?.trim().toUpperCase() || null,
        ownershipType: input.ownershipType ?? "Owned",
        condition: input.condition ?? "Unknown",
        purchaseDate: input.purchaseDate,
        purchasePriceCents: input.purchasePriceCents,
        replacementValueCents: input.replacementValueCents,
        parentAssetId: input.parentAssetId,
        notes: input.notes?.trim() ?? "",
      },
    });
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "Created",
      sourceType: "FleetAsset",
      sourceId: asset.id,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_created",
      "FleetAsset",
      asset.id,
    );
    return asset;
  });
}

export async function updateAsset(
  companyId: string,
  userId: string,
  assetId: string,
  input: Partial<Omit<CreateAssetInput, "category">> & {
    category?: AssetCategory;
    status?: FleetAssetStatus;
  },
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.fleetAsset.findFirst({
      where: { id: assetId, companyId },
    });
    if (!current) throw new Error("Asset not found.");
    if (
      input.status &&
      (blockedStatuses.includes(input.status) ||
        blockedStatuses.includes(current.status))
    )
      throw new Error(
        "Retirement, sale, loss, theft, and reactivation require the asset lifecycle action.",
      );
    if (input.parentAssetId) {
      const rows = await tx.fleetAsset.findMany({
        where: { companyId },
        select: { id: true, parentAssetId: true },
      });
      assertNoRecursiveParent(
        assetId,
        input.parentAssetId,
        new Map(rows.map((row) => [row.id, row.parentAssetId])),
      );
    }
    const updated = await tx.fleetAsset.update({
      where: { id: current.id },
      data: {
        ...input,
        type: input.category ? legacyType(input.category) : undefined,
        assetNumber: input.assetNumber?.trim(),
        name: input.name?.trim(),
        vin: input.vin?.trim().toUpperCase(),
        serialNumber: input.serialNumber?.trim(),
        licensePlate: input.licensePlate?.trim().toUpperCase(),
        notes: input.notes?.trim(),
      },
    });
    if (input.status && input.status !== current.status)
      await timeline(tx, {
        companyId,
        assetId,
        eventType: "StatusChanged",
        sourceType: "FleetAssetStatus",
        sourceId: `${assetId}:${updated.updatedAt.toISOString()}`,
        createdById: userId,
        metadata: { from: current.status, to: input.status },
      });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_updated",
      "FleetAsset",
      assetId,
    );
    return updated;
  });
}

export const markAssetOutOfService = (
  companyId: string,
  userId: string,
  assetId: string,
) => updateAsset(companyId, userId, assetId, { status: "OutOfService" });
export type AssetLifecycleStatus = "Retired" | "Sold" | "Lost" | "Stolen";

const removalChecks = [
  ["assignments", "assignments"],
  ["mileageEntries", "mileage entries"],
  ["fuelEntries", "fuel entries"],
  ["maintenanceSchedules", "maintenance schedules"],
  ["maintenanceRecords", "maintenance records"],
  ["legacyMaintenance", "legacy maintenance records"],
  ["inspectionRecords", "inspections"],
  ["inspectionDefects", "inspection defects"],
  ["documents", "documents"],
  ["jobLinks", "job links"],
  ["vehicleAssignments", "dispatch vehicle assignments"],
  ["employeeLinks", "employee truck links"],
  ["childAssets", "dependent child assets"],
  ["expenseAllocations", "expense allocations"],
  ["financeDocuments", "finance documents"],
  ["recurringExpenses", "recurring expenses"],
  ["timelineHistory", "timeline history"],
] as const;

async function assetReferenceCounts(tx: Tx, companyId: string, assetId: string) {
  const [
    assignments,
    mileageEntries,
    fuelEntries,
    maintenanceSchedules,
    maintenanceRecords,
    legacyMaintenance,
    inspectionRecords,
    inspectionDefects,
    documents,
    jobLinks,
    vehicleAssignments,
    employeeLinks,
    childAssets,
    expenseAllocations,
    financeDocuments,
    recurringExpenses,
    timelineHistory,
  ] = await Promise.all([
    tx.assetAssignment.count({
      where: { companyId, OR: [{ assetId }, { parentAssetId: assetId }] },
    }),
    tx.assetMileageEntry.count({ where: { companyId, assetId } }),
    tx.fuelEntry.count({ where: { companyId, assetId } }),
    tx.maintenanceSchedule.count({ where: { companyId, assetId } }),
    tx.assetMaintenanceRecord.count({ where: { companyId, assetId } }),
    tx.fleetMaintenance.count({ where: { companyId, assetId } }),
    tx.inspectionRecord.count({ where: { companyId, assetId } }),
    tx.inspectionDefect.count({ where: { companyId, assetId } }),
    tx.assetDocument.count({ where: { companyId, assetId } }),
    tx.job.count({ where: { companyId, assignedFleetAssetId: assetId } }),
    tx.jobVehicleAssignment.count({ where: { fleetAssetId: assetId, job: { companyId } } }),
    tx.employee.count({ where: { companyId, assignedTruckId: assetId } }),
    tx.fleetAsset.count({ where: { companyId, parentAssetId: assetId } }),
    tx.expenseAllocation.count({ where: { companyId, assetId } }),
    tx.financeDocument.count({ where: { companyId, assetId } }),
    tx.recurringExpense.count({ where: { companyId, linkedAssetId: assetId } }),
    tx.assetTimelineEvent.count({
      where: { companyId, assetId, eventType: { not: "Created" } },
    }),
  ]);
  return {
    assignments,
    mileageEntries,
    fuelEntries,
    maintenanceSchedules,
    maintenanceRecords,
    legacyMaintenance,
    inspectionRecords,
    inspectionDefects,
    documents,
    jobLinks,
    vehicleAssignments,
    employeeLinks,
    childAssets,
    expenseAllocations,
    financeDocuments,
    recurringExpenses,
    timelineHistory,
  };
}

export async function getAssetRemovalEligibility(
  companyId: string,
  assetId: string,
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true, name: true },
    });
    if (!asset) throw new Error("Asset not found.");
    const counts = await assetReferenceCounts(tx, companyId, assetId);
    const blockers = removalChecks
      .filter(([key]) => counts[key] > 0)
      .map(([key, label]) => ({ key, label, count: counts[key] }));
    return { asset, canDelete: blockers.length === 0, blockers };
  });
}

export async function deleteUnusedAsset(
  companyId: string,
  userId: string,
  assetId: string,
  confirmation: string,
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true, name: true },
    });
    if (!asset) throw new Error("Asset not found.");
    if (confirmation.trim() !== asset.name)
      throw new Error(`Type "${asset.name}" to confirm permanent deletion.`);
    const counts = await assetReferenceCounts(tx, companyId, assetId);
    const blockers = removalChecks
      .filter(([key]) => counts[key] > 0)
      .map(([, label]) => label);
    if (blockers.length)
      throw new Error(
        `Permanent deletion is unavailable because this asset has ${blockers.join(", ")}. Retire it or choose another lifecycle status instead.`,
      );
    await tx.assetTimelineEvent.deleteMany({
      where: { companyId, assetId, eventType: "Created" },
    });
    await tx.vehicleProfile.deleteMany({ where: { assetId } });
    await tx.trailerProfile.deleteMany({ where: { assetId } });
    await tx.fleetAsset.delete({ where: { id: asset.id } });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_deleted",
      "FleetAsset",
      asset.id,
      { name: asset.name, permanent: true },
    );
    return { id: asset.id, name: asset.name };
  });
}

export async function changeAssetLifecycle(
  companyId: string,
  userId: string,
  assetId: string,
  nextStatus: AssetLifecycleStatus | "Available",
  reason: string,
) {
  if (!reason.trim()) throw new Error("A reason is required.");
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: assetId, companyId },
      select: { id: true, name: true, status: true },
    });
    if (!asset) throw new Error("Asset not found.");
    const reactivating = nextStatus === "Available";
    if (reactivating && !blockedStatuses.includes(asset.status))
      throw new Error("Only a retired, sold, lost, or stolen asset can be reactivated.");
    if (!reactivating && blockedStatuses.includes(asset.status))
      throw new Error("Reactivate this asset before applying another terminal status.");
    const now = new Date();
    if (!reactivating) {
      await tx.assetAssignment.updateMany({
        where: {
          companyId,
          returnedAt: null,
          OR: [{ assetId }, { parentAssetId: assetId }],
        },
        data: { returnedAt: now, returnedById: userId },
      });
      await tx.fleetAsset.updateMany({
        where: { companyId, parentAssetId: assetId },
        data: { parentAssetId: null },
      });
    }
    const updated = await tx.fleetAsset.update({
      where: { id: asset.id },
      data: {
        status: nextStatus,
        assignedEmployeeId: reactivating ? undefined : null,
        assignedCrewId: reactivating ? undefined : null,
        parentAssetId: reactivating ? undefined : null,
      },
    });
    await timeline(tx, {
      companyId,
      assetId,
      eventType: reactivating ? "StatusChanged" : nextStatus,
      sourceType: "FleetAssetStatus",
      sourceId: `${assetId}:${updated.updatedAt.toISOString()}`,
      createdById: userId,
      metadata: { from: asset.status, to: nextStatus, reason: reason.trim() },
    });
    await audit(
      tx,
      companyId,
      userId,
      `fleet.asset_${reactivating ? "reactivated" : nextStatus.toLowerCase()}`,
      "FleetAsset",
      assetId,
      { from: asset.status, to: nextStatus, reason: reason.trim() },
    );
    return updated;
  });
}

export async function assignAsset(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    assigneeType: AssetAssignmentType;
    employeeId?: string;
    crewId?: string;
    parentAssetId?: string;
    jobId?: string;
    startingCondition: AssetCondition;
    startingOdometerMiles?: number;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: input.assetId, companyId },
    });
    if (!asset) throw new Error("Asset not found.");
    if (blockedStatuses.includes(asset.status))
      throw new Error("This asset status cannot be assigned.");
    if (
      await tx.assetAssignment.findFirst({
        where: { companyId, assetId: asset.id, returnedAt: null },
        select: { id: true },
      })
    )
      throw new Error("Asset already has an active assignment.");
    const targets = [
      input.employeeId,
      input.crewId,
      input.parentAssetId,
      input.jobId,
    ].filter(Boolean);
    if (targets.length !== 1)
      throw new Error("An assignment requires exactly one target.");
    if (input.employeeId) {
      const employee = await tx.employee.findFirst({
        where: { id: input.employeeId, companyId },
      });
      if (!employee) throw new Error("Employee not found.");
      if (
        asset.category === "Vehicle" &&
        (!employee.authorizedDriver ||
          employee.status !== "Active" ||
          (employee.driverLicenseExpiresAt &&
            employee.driverLicenseExpiresAt < new Date()))
      )
        throw new Error("The selected employee is not an authorized driver.");
    }
    if (
      input.crewId &&
      !(await tx.crew.findFirst({ where: { id: input.crewId, companyId } }))
    )
      throw new Error("Crew not found.");
    if (
      input.jobId &&
      !(await tx.job.findFirst({ where: { id: input.jobId, companyId } }))
    )
      throw new Error("Job not found.");
    if (input.parentAssetId) {
      const rows = await tx.fleetAsset.findMany({
        where: { companyId },
        select: { id: true, parentAssetId: true },
      });
      assertNoRecursiveParent(
        asset.id,
        input.parentAssetId,
        new Map(rows.map((row) => [row.id, row.parentAssetId])),
      );
    }
    const assignment = await tx.assetAssignment.create({
      data: {
        companyId,
        assignedById: userId,
        ...input,
        notes: input.notes?.trim() || null,
      },
    });
    await tx.fleetAsset.update({
      where: { id: asset.id },
      data: {
        status: "Assigned",
        assignedEmployeeId: input.employeeId ?? null,
        assignedCrewId: input.crewId ?? null,
        parentAssetId: input.parentAssetId ?? asset.parentAssetId,
      },
    });
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "Assigned",
      sourceType: "AssetAssignment",
      sourceId: assignment.id,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_assigned",
      "AssetAssignment",
      assignment.id,
    );
    return assignment;
  });
}

export async function returnAsset(
  companyId: string,
  userId: string,
  assignmentId: string,
  input: {
    returnCondition: AssetCondition;
    endingOdometerMiles?: number;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    const active = await tx.assetAssignment.findFirst({
      where: { id: assignmentId, companyId, returnedAt: null },
    });
    if (!active) throw new Error("Active asset assignment not found.");
    const returned = await tx.assetAssignment.update({
      where: { id: active.id },
      data: {
        ...input,
        returnedAt: new Date(),
        returnedById: userId,
        notes: input.notes?.trim() || active.notes,
      },
    });
    await tx.fleetAsset.update({
      where: { id: active.assetId },
      data: {
        status: "Available",
        condition: input.returnCondition,
        assignedEmployeeId: null,
        assignedCrewId: null,
      },
    });
    await timeline(tx, {
      companyId,
      assetId: active.assetId,
      eventType: "Returned",
      sourceType: "AssetAssignment",
      sourceId: active.id,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_returned",
      "AssetAssignment",
      active.id,
    );
    return returned;
  });
}

export async function transferAsset(
  companyId: string,
  userId: string,
  assignmentId: string,
  next: Parameters<typeof assignAsset>[2],
) {
  return prisma.$transaction(async (tx) => {
    const active = await tx.assetAssignment.findFirst({
      where: {
        id: assignmentId,
        companyId,
        assetId: next.assetId,
        returnedAt: null,
      },
      include: { asset: true },
    });
    if (!active) throw new Error("Active asset assignment not found.");
    if (blockedStatuses.includes(active.asset.status))
      throw new Error("This asset status cannot be transferred.");
    const targets = [
      next.employeeId,
      next.crewId,
      next.parentAssetId,
      next.jobId,
    ].filter(Boolean);
    if (targets.length !== 1)
      throw new Error("A transfer requires exactly one target.");
    if (next.employeeId) {
      const employee = await tx.employee.findFirst({
        where: { id: next.employeeId, companyId },
      });
      if (!employee) throw new Error("Employee not found.");
      if (
        active.asset.category === "Vehicle" &&
        (!employee.authorizedDriver ||
          employee.status !== "Active" ||
          (employee.driverLicenseExpiresAt &&
            employee.driverLicenseExpiresAt < new Date()))
      )
        throw new Error("The selected employee is not an authorized driver.");
    }
    if (
      next.crewId &&
      !(await tx.crew.findFirst({ where: { id: next.crewId, companyId } }))
    )
      throw new Error("Crew not found.");
    if (
      next.jobId &&
      !(await tx.job.findFirst({ where: { id: next.jobId, companyId } }))
    )
      throw new Error("Job not found.");
    if (next.parentAssetId) {
      const rows = await tx.fleetAsset.findMany({
        where: { companyId },
        select: { id: true, parentAssetId: true },
      });
      assertNoRecursiveParent(
        next.assetId,
        next.parentAssetId,
        new Map(rows.map((row) => [row.id, row.parentAssetId])),
      );
    }
    const returnedAt = new Date();
    await tx.assetAssignment.update({
      where: { id: active.id },
      data: {
        returnedAt,
        returnedById: userId,
        returnCondition: next.startingCondition,
        endingOdometerMiles: next.startingOdometerMiles,
      },
    });
    const transferred = await tx.assetAssignment.create({
      data: {
        companyId,
        assignedById: userId,
        ...next,
        notes: next.notes?.trim() || null,
      },
    });
    await tx.fleetAsset.update({
      where: { id: active.assetId },
      data: {
        status: "Assigned",
        assignedEmployeeId: next.employeeId ?? null,
        assignedCrewId: next.crewId ?? null,
        parentAssetId: next.parentAssetId ?? active.asset.parentAssetId,
      },
    });
    await timeline(tx, {
      companyId,
      assetId: active.assetId,
      eventType: "Transferred",
      sourceType: "AssetAssignment",
      sourceId: transferred.id,
      occurredAt: returnedAt,
      createdById: userId,
      metadata: { priorAssignmentId: active.id },
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.asset_transferred",
      "AssetAssignment",
      transferred.id,
    );
    return transferred;
  });
}

export async function recordMileage(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    odometerMiles: number;
    recordedAt: Date;
    source: AssetMileageSource;
    employeeId?: string;
    jobId?: string;
    notes?: string;
    allowFuture?: boolean;
  },
) {
  if (!Number.isInteger(input.odometerMiles) || input.odometerMiles < 0)
    throw new Error("Odometer miles must be a non-negative whole number.");
  if (input.recordedAt > new Date() && !input.allowFuture)
    throw new Error("Future mileage entries require explicit authorization.");
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: input.assetId, companyId },
    });
    if (!asset) throw new Error("Vehicle asset not found.");
    if (asset.category !== "Vehicle")
      throw new Error("Mileage can only be recorded for vehicle assets.");
    if (asset.odometer != null && input.odometerMiles < asset.odometer)
      throw new Error("Odometer cannot decrease without a correction.");
    if (
      await tx.assetMileageEntry.findFirst({
        where: {
          companyId,
          assetId: asset.id,
          odometerMiles: input.odometerMiles,
          recordedAt: input.recordedAt,
          voidedAt: null,
        },
        select: { id: true },
      })
    )
      throw new Error("Duplicate mileage entry detected.");
    if (
      input.employeeId &&
      !(await tx.employee.findFirst({
        where: { id: input.employeeId, companyId },
      }))
    )
      throw new Error("Employee not found.");
    if (
      input.jobId &&
      !(await tx.job.findFirst({ where: { id: input.jobId, companyId } }))
    )
      throw new Error("Job not found.");
    const { allowFuture: _allowFuture, ...entryInput } = input;
    void _allowFuture;
    const entry = await tx.assetMileageEntry.create({
      data: {
        companyId,
        createdById: userId,
        ...entryInput,
        notes: input.notes?.trim() || null,
      },
    });
    await tx.fleetAsset.update({
      where: { id: asset.id },
      data: { odometer: input.odometerMiles },
    });
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "MileageRecorded",
      sourceType: "AssetMileageEntry",
      sourceId: entry.id,
      occurredAt: entry.recordedAt,
      createdById: userId,
    });
    return entry;
  });
}

export async function correctMileage(
  companyId: string,
  userId: string,
  entryId: string,
  input: { odometerMiles: number; reason: string },
) {
  if (!input.reason.trim()) throw new Error("A correction reason is required.");
  return prisma.$transaction(async (tx) => {
    const original = await tx.assetMileageEntry.findFirst({
      where: { id: entryId, companyId, voidedAt: null },
    });
    if (!original) throw new Error("Mileage entry not found.");
    const corrected = await tx.assetMileageEntry.create({
      data: {
        companyId,
        assetId: original.assetId,
        odometerMiles: input.odometerMiles,
        recordedAt: original.recordedAt,
        source: "Manual",
        employeeId: original.employeeId,
        jobId: original.jobId,
        notes: original.notes,
        createdById: userId,
        originalEntryId: original.id,
        correctionReason: input.reason.trim(),
        correctedById: userId,
        correctedAt: new Date(),
      },
    });
    await tx.assetMileageEntry.update({
      where: { id: original.id },
      data: { voidedAt: new Date() },
    });
    const latest = await tx.assetMileageEntry.findFirst({
      where: { companyId, assetId: original.assetId, voidedAt: null },
      orderBy: [{ odometerMiles: "desc" }, { recordedAt: "desc" }],
    });
    await tx.fleetAsset.update({
      where: { id: original.assetId },
      data: { odometer: latest?.odometerMiles ?? corrected.odometerMiles },
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.mileage_corrected",
      "AssetMileageEntry",
      corrected.id,
      {
        originalEntryId: original.id,
      },
    );
    return corrected;
  });
}

export async function recordFuel(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    employeeId?: string;
    transactionAt: Date;
    odometerMiles?: number;
    gallons: number;
    totalCostCents: number;
    pricePerGallonCents: number;
    fuelType?: string;
    vendor?: string;
    paymentMethod?: string;
    jobId?: string;
    fullTank: boolean;
    notes?: string;
  },
) {
  validateFuelConsistency(input);
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: input.assetId, companyId },
    });
    if (!asset || asset.category !== "Vehicle")
      throw new Error("Vehicle asset not found.");
    if (
      input.odometerMiles != null &&
      asset.odometer != null &&
      input.odometerMiles < asset.odometer
    )
      throw new Error("Fuel odometer cannot be lower than current mileage.");
    if (
      input.employeeId &&
      !(await tx.employee.findFirst({
        where: { id: input.employeeId, companyId },
      }))
    )
      throw new Error("Employee not found.");
    if (
      input.jobId &&
      !(await tx.job.findFirst({ where: { id: input.jobId, companyId } }))
    )
      throw new Error("Job not found.");
    const entry = await tx.fuelEntry.create({
      data: {
        companyId,
        createdById: userId,
        ...input,
        notes: input.notes?.trim() || null,
      },
    });
    if (input.odometerMiles != null) {
      const mileage = await tx.assetMileageEntry.create({
        data: {
          companyId,
          assetId: asset.id,
          odometerMiles: input.odometerMiles,
          recordedAt: input.transactionAt,
          source: "Fuel",
          employeeId: input.employeeId,
          jobId: input.jobId,
          fuelEntryId: entry.id,
          createdById: userId,
        },
      });
      await tx.fleetAsset.update({
        where: { id: asset.id },
        data: { odometer: input.odometerMiles },
      });
      await timeline(tx, {
        companyId,
        assetId: asset.id,
        eventType: "MileageRecorded",
        sourceType: "AssetMileageEntry",
        sourceId: mileage.id,
        occurredAt: input.transactionAt,
        createdById: userId,
      });
    }
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "Fueled",
      sourceType: "FuelEntry",
      sourceId: entry.id,
      occurredAt: entry.transactionAt,
      createdById: userId,
    });
    return entry;
  });
}

export async function createMaintenanceSchedule(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    serviceType: string;
    triggerType: MaintenanceTriggerType;
    intervalMiles?: number;
    intervalDays?: number;
    dueOdometerMiles?: number;
    dueDate?: Date;
    warningLeadMiles?: number;
    warningLeadDays?: number;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    if (
      !(await tx.fleetAsset.findFirst({
        where: { id: input.assetId, companyId },
      }))
    )
      throw new Error("Asset not found.");
    const schedule = await tx.maintenanceSchedule.create({
      data: {
        companyId,
        ...input,
        serviceType: input.serviceType.trim(),
        notes: input.notes?.trim() || null,
      },
    });
    await timeline(tx, {
      companyId,
      assetId: input.assetId,
      eventType: "ServiceScheduled",
      sourceType: "MaintenanceSchedule",
      sourceId: schedule.id,
      createdById: userId,
    });
    return schedule;
  });
}

export async function completeMaintenance(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    scheduleId?: string;
    serviceType: string;
    serviceDate: Date;
    odometerMiles?: number;
    vendor?: string;
    description: string;
    laborCostCents?: number;
    partsCostCents?: number;
    taxCostCents?: number;
    totalCostCents?: number;
    performedByEmployeeId?: string;
    warrantyWork?: boolean;
    downtimeStartedAt?: Date;
    downtimeEndedAt?: Date;
    invoiceNumber?: string;
    notes?: string;
    markAvailable?: boolean;
  },
) {
  return prisma.$transaction(async (tx) => {
    const asset = await tx.fleetAsset.findFirst({
      where: { id: input.assetId, companyId },
    });
    if (!asset) throw new Error("Asset not found.");
    const schedule = input.scheduleId
      ? await tx.maintenanceSchedule.findFirst({
          where: { id: input.scheduleId, companyId, assetId: asset.id },
        })
      : null;
    if (input.scheduleId && !schedule)
      throw new Error("Maintenance schedule not found.");
    const { markAvailable: _markAvailable, ...recordInput } = input;
    void _markAvailable;
    const record = await tx.assetMaintenanceRecord.create({
      data: {
        companyId,
        createdById: userId,
        ...recordInput,
        serviceType: input.serviceType.trim(),
        description: input.description.trim(),
        notes: input.notes?.trim() || null,
      },
    });
    if (schedule) {
      const dueDate =
        schedule.intervalDays != null
          ? new Date(
              input.serviceDate.getTime() + schedule.intervalDays * 86_400_000,
            )
          : schedule.dueDate;
      const dueOdometerMiles =
        schedule.intervalMiles != null && input.odometerMiles != null
          ? input.odometerMiles + schedule.intervalMiles
          : schedule.dueOdometerMiles;
      await tx.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: {
          lastCompletedAt: input.serviceDate,
          lastCompletedOdometer: input.odometerMiles,
          dueDate,
          dueOdometerMiles,
        },
      });
    }
    if (input.odometerMiles != null) {
      await tx.assetMileageEntry.create({
        data: {
          companyId,
          assetId: asset.id,
          odometerMiles: input.odometerMiles,
          recordedAt: input.serviceDate,
          source: "Service",
          maintenanceRecordId: record.id,
          createdById: userId,
        },
      });
      await tx.fleetAsset.update({
        where: { id: asset.id },
        data: {
          odometer: Math.max(asset.odometer ?? 0, input.odometerMiles),
          status: input.markAvailable ? "Available" : undefined,
        },
      });
    } else if (input.markAvailable) {
      await tx.fleetAsset.update({
        where: { id: asset.id },
        data: { status: "Available" },
      });
    }
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "ServiceCompleted",
      sourceType: "AssetMaintenanceRecord",
      sourceId: record.id,
      occurredAt: input.serviceDate,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.maintenance_completed",
      "AssetMaintenanceRecord",
      record.id,
    );
    return record;
  });
}

export async function recordInspection(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    templateId?: string;
    inspectorEmployeeId: string;
    inspectedAt: Date;
    odometerMiles?: number;
    result: "Passed" | "PassedWithDefects" | "Failed";
    checklistResults: Prisma.InputJsonValue;
    notes?: string;
    defects?: Array<{
      checklistItemKey: string;
      description: string;
      severity: string;
      outOfServiceTrigger?: boolean;
    }>;
  },
) {
  return prisma.$transaction(async (tx) => {
    const [asset, employee] = await Promise.all([
      tx.fleetAsset.findFirst({ where: { id: input.assetId, companyId } }),
      tx.employee.findFirst({
        where: { id: input.inspectorEmployeeId, companyId, status: "Active" },
      }),
    ]);
    if (!asset || !employee) throw new Error("Asset or inspector not found.");
    if (
      input.templateId &&
      !(await tx.inspectionTemplate.findFirst({
        where: { id: input.templateId, companyId, active: true },
      }))
    )
      throw new Error("Inspection template not found.");
    const record = await tx.inspectionRecord.create({
      data: {
        companyId,
        assetId: asset.id,
        templateId: input.templateId,
        inspectorEmployeeId: employee.id,
        inspectedAt: input.inspectedAt,
        odometerMiles: input.odometerMiles,
        result: input.result,
        checklistResults: input.checklistResults,
        notes: input.notes?.trim() || null,
      },
    });
    for (const defect of input.defects ?? []) {
      const created = await tx.inspectionDefect.create({
        data: {
          companyId,
          assetId: asset.id,
          inspectionRecordId: record.id,
          ...defect,
        },
      });
      await timeline(tx, {
        companyId,
        assetId: asset.id,
        eventType: "DefectReported",
        sourceType: "InspectionDefect",
        sourceId: created.id,
        occurredAt: input.inspectedAt,
        createdById: userId,
      });
      if (defect.outOfServiceTrigger) {
        await tx.fleetAsset.update({
          where: { id: asset.id },
          data: { status: "OutOfService" },
        });
        await notifyOnce(tx, {
          companyId,
          title: "Asset placed out of service",
          body: `${asset.name} failed a critical inspection item.`,
          sourceType: "InspectionDefect",
          sourceId: created.id,
          link: `/fleet/${asset.id}?section=inspections`,
        });
      }
    }
    await timeline(tx, {
      companyId,
      assetId: asset.id,
      eventType: "InspectionCompleted",
      sourceType: "InspectionRecord",
      sourceId: record.id,
      occurredAt: input.inspectedAt,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.inspection_completed",
      "InspectionRecord",
      record.id,
    );
    return record;
  });
}

export async function resolveDefect(
  companyId: string,
  userId: string,
  defectId: string,
  input: { resolutionNotes: string; maintenanceRecordId?: string },
) {
  if (!input.resolutionNotes.trim())
    throw new Error("Resolution notes are required.");
  return prisma.$transaction(async (tx) => {
    const defect = await tx.inspectionDefect.findFirst({
      where: { id: defectId, companyId, status: "Open" },
    });
    if (!defect) throw new Error("Open defect not found.");
    const resolved = await tx.inspectionDefect.update({
      where: { id: defect.id },
      data: {
        status: "Resolved",
        resolvedAt: new Date(),
        resolutionNotes: input.resolutionNotes.trim(),
        maintenanceRecordId: input.maintenanceRecordId,
      },
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.defect_resolved",
      "InspectionDefect",
      defect.id,
    );
    return resolved;
  });
}

export async function createAssetDocument(
  companyId: string,
  userId: string,
  input: {
    assetId: string;
    category: AssetDocumentCategory;
    storageKey: string;
    displayFilename: string;
    mimeType: string;
    sizeBytes: number;
    effectiveDate?: Date;
    expirationDate?: Date;
    fuelEntryId?: string;
    maintenanceRecordId?: string;
    inspectionRecordId?: string;
    notes?: string;
  },
) {
  return prisma.$transaction(async (tx) => {
    if (
      !(await tx.fleetAsset.findFirst({
        where: { id: input.assetId, companyId },
      }))
    )
      throw new Error("Asset not found.");
    const document = await tx.assetDocument.create({
      data: {
        companyId,
        uploadedById: userId,
        ...input,
        notes: input.notes?.trim() || null,
      },
    });
    await timeline(tx, {
      companyId,
      assetId: input.assetId,
      eventType: "DocumentAdded",
      sourceType: "AssetDocument",
      sourceId: document.id,
      createdById: userId,
    });
    await audit(
      tx,
      companyId,
      userId,
      "fleet.document_added",
      "AssetDocument",
      document.id,
    );
    return document;
  });
}

export async function getAssetDirectory(
  companyId: string,
  filters: {
    search?: string;
    category?: AssetCategory;
    categories?: AssetCategory[];
    status?: FleetAssetStatus;
    condition?: AssetCondition;
    assigned?: boolean;
  } = {},
  accessWhere: Prisma.FleetAssetWhereInput = {},
) {
  return prisma.fleetAsset.findMany({
    where: {
      companyId,
      AND: [accessWhere],
      category: filters.categories
        ? { in: filters.categories }
        : filters.category,
      status: filters.status ?? { notIn: blockedStatuses },
      condition: filters.condition,
      ...(filters.assigned === undefined
        ? {}
        : {
            assignments: filters.assigned
              ? { some: { returnedAt: null } }
              : { none: { returnedAt: null } },
          }),
      ...(filters.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: "insensitive" } },
              {
                assetNumber: { contains: filters.search, mode: "insensitive" },
              },
              { vin: { contains: filters.search, mode: "insensitive" } },
              {
                serialNumber: { contains: filters.search, mode: "insensitive" },
              },
            ],
          }
        : {}),
    },
    include: {
      assignedEmployee: { select: { firstName: true, lastName: true } },
      assignedCrew: { select: { name: true } },
      assignments: { where: { returnedAt: null }, take: 1 },
      maintenanceSchedules: { where: { active: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });
}

export async function getAssetDetail(
  companyId: string,
  assetId: string,
  accessWhere: Prisma.FleetAssetWhereInput = {},
) {
  return prisma.fleetAsset.findFirst({
    where: { id: assetId, companyId, AND: [accessWhere] },
    include: {
      vehicleProfile: true,
      trailerProfile: true,
      assignedEmployee: true,
      assignedCrew: true,
      assignments: { orderBy: { assignedAt: "desc" }, take: 100 },
      mileageEntries: { orderBy: { recordedAt: "desc" }, take: 100 },
      fuelEntries: { orderBy: { transactionAt: "desc" }, take: 100 },
      maintenanceSchedules: true,
      maintenanceRecords: { orderBy: { serviceDate: "desc" }, take: 100 },
      inspectionRecords: {
        orderBy: { inspectedAt: "desc" },
        include: { defects: true },
        take: 100,
      },
      documents: { orderBy: { createdAt: "desc" } },
      timelineEvents: { orderBy: { occurredAt: "desc" }, take: 200 },
    },
  });
}

export async function getAssignedFleetAssetWhere(
  companyId: string,
  userId: string,
): Promise<Prisma.FleetAssetWhereInput> {
  const employee = await prisma.employee.findFirst({
    where: { companyId, userId, status: "Active" },
    select: {
      id: true,
      defaultCrewId: true,
      crewMembers: { select: { crewId: true } },
      assignments: {
        where: { status: { in: ["Assigned", "Confirmed"] } },
        select: { jobId: true, crewId: true },
      },
    },
  });
  if (!employee) return { id: { in: [] } };
  const crewIds = Array.from(
    new Set([
      ...(employee.defaultCrewId ? [employee.defaultCrewId] : []),
      ...employee.crewMembers.map((row) => row.crewId),
      ...employee.assignments.flatMap((row) => (row.crewId ? [row.crewId] : [])),
    ]),
  );
  const jobIds = employee.assignments.map((row) => row.jobId);
  return {
    OR: [
      { assignedEmployeeId: employee.id },
      ...(crewIds.length ? [{ assignedCrewId: { in: crewIds } }] : []),
      {
        assignments: {
          some: {
            returnedAt: null,
            OR: [
              { employeeId: employee.id },
              ...(crewIds.length ? [{ crewId: { in: crewIds } }] : []),
              ...(jobIds.length ? [{ jobId: { in: jobIds } }] : []),
            ],
          },
        },
      },
      ...(jobIds.length
        ? [{ jobVehicleAssignments: { some: { jobId: { in: jobIds } } } }]
        : []),
    ],
  };
}

export async function canUserAccessFleetAsset(
  companyId: string,
  userId: string,
  assetId: string,
) {
  const accessWhere = await getAssignedFleetAssetWhere(companyId, userId);
  return Boolean(
    await prisma.fleetAsset.findFirst({
      where: { id: assetId, companyId, AND: [accessWhere] },
      select: { id: true },
    }),
  );
}

export async function getFleetAssignmentOptions(companyId: string) {
  const [employees, crews, jobs, assets] = await Promise.all([
    prisma.employee.findMany({
      where: { companyId, status: "Active" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        authorizedDriver: true,
      },
      orderBy: { firstName: "asc" },
    }),
    prisma.crew.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.job.findMany({
      where: {
        companyId,
        status: { in: ["Unscheduled", "Scheduled", "InProgress"] },
      },
      select: { id: true, jobNumber: true },
      orderBy: { scheduledStart: "desc" },
      take: 100,
    }),
    prisma.fleetAsset.findMany({
      where: {
        companyId,
        status: { notIn: blockedStatuses },
      },
      select: { id: true, assetNumber: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return { employees, crews, jobs, assets };
}

export async function getFleetDashboard(companyId: string, now = new Date()) {
  const warning = new Date(now.getTime() + 30 * 86_400_000);
  const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const [assets, schedules, fuelCost, defects, documents] = await Promise.all([
    prisma.fleetAsset.findMany({ where: { companyId } }),
    prisma.maintenanceSchedule.findMany({
      where: { companyId, active: true },
      include: { asset: { select: { name: true, odometer: true } } },
    }),
    prisma.fuelEntry.aggregate({
      where: { companyId, transactionAt: { gte: month, lte: now } },
      _sum: { totalCostCents: true },
    }),
    prisma.inspectionDefect.count({ where: { companyId, status: "Open" } }),
    prisma.assetDocument.findMany({
      where: { companyId, expirationDate: { lte: warning, gte: now } },
    }),
  ]);
  const scheduleStates = schedules.map((schedule) => ({
    ...schedule,
    calculatedStatus: maintenanceStatus({
      ...schedule,
      currentOdometerMiles: schedule.asset.odometer,
      now,
    }),
  }));
  return {
    totalActive: assets.filter(
      (asset) => !blockedStatuses.includes(asset.status),
    ).length,
    vehiclesAvailable: assets.filter(
      (asset) =>
        asset.category === "Vehicle" &&
        ["Active", "Available"].includes(asset.status),
    ).length,
    trailersAvailable: assets.filter(
      (asset) =>
        asset.category === "Trailer" &&
        ["Active", "Available"].includes(asset.status),
    ).length,
    outOfService: assets.filter((asset) =>
      ["OutOfService", "Repair", "Maintenance"].includes(asset.status),
    ).length,
    maintenanceDueSoon: scheduleStates.filter(
      (row) => row.calculatedStatus === "DueSoon",
    ).length,
    maintenanceOverdue: scheduleStates.filter(
      (row) => row.calculatedStatus === "Overdue",
    ).length,
    expiringRegistrations: documents.filter(
      (row) => row.category === "Registration",
    ).length,
    expiringInsurance: documents.filter((row) => row.category === "Insurance")
      .length,
    missingMileage: assets.filter(
      (asset) => asset.category === "Vehicle" && asset.odometer == null,
    ).length,
    recentFuelCostCents: fuelCost._sum.totalCostCents ?? 0,
    unresolvedDefects: defects,
  };
}

export async function getDueMaintenance(companyId: string, now = new Date()) {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { companyId, active: true },
    include: { asset: true },
  });
  return schedules
    .map((schedule) => ({
      ...schedule,
      calculatedStatus: maintenanceStatus({
        ...schedule,
        currentOdometerMiles: schedule.asset.odometer,
        now,
      }),
    }))
    .filter((row) => row.calculatedStatus !== "Upcoming");
}

export function fuelMetricsForEntries(
  current: {
    odometerMiles: number | null;
    gallons: number;
    totalCostCents: number;
    fullTank: boolean;
  },
  prior?: { odometerMiles: number | null; fullTank: boolean } | null,
) {
  return deriveFuelMetrics(current, prior);
}

export async function getFuelSummary(companyId: string, from: Date, to: Date) {
  return prisma.fuelEntry.groupBy({
    by: ["assetId"],
    where: { companyId, transactionAt: { gte: from, lte: to } },
    _sum: { totalCostCents: true, gallons: true },
    _count: true,
  });
}

export async function getCostSummary(companyId: string, from: Date, to: Date) {
  const [fuel, maintenance] = await Promise.all([
    prisma.fuelEntry.aggregate({
      where: { companyId, transactionAt: { gte: from, lte: to } },
      _sum: { totalCostCents: true },
    }),
    prisma.assetMaintenanceRecord.aggregate({
      where: { companyId, serviceDate: { gte: from, lte: to } },
      _sum: { totalCostCents: true },
    }),
  ]);
  return {
    fuelCostCents: fuel._sum.totalCostCents ?? 0,
    maintenanceCostCents: maintenance._sum.totalCostCents ?? 0,
  };
}

export async function evaluateFleetAlerts(companyId: string, now = new Date()) {
  const dashboard = await getFleetDashboard(companyId, now);
  return prisma.$transaction(async (tx) => {
    const alerts = [
      ["Maintenance overdue", dashboard.maintenanceOverdue],
      ["Registrations expiring", dashboard.expiringRegistrations],
      ["Insurance expiring", dashboard.expiringInsurance],
      ["Missing mileage", dashboard.missingMileage],
      ["Unresolved fleet defects", dashboard.unresolvedDefects],
    ] as const;
    for (const [title, count] of alerts)
      if (count)
        await notifyOnce(tx, {
          companyId,
          title,
          body: `${count} fleet record${count === 1 ? "" : "s"} require attention.`,
          sourceType: "FleetAlert",
          sourceId: title,
          link: "/fleet",
        });
    return alerts.filter(([, count]) => count).length;
  });
}
