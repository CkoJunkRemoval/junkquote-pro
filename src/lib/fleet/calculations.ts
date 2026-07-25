import type { MaintenanceTriggerType } from "@/generated/prisma/client";

export function validateFuelConsistency(input: {
  gallons: number;
  totalCostCents: number;
  pricePerGallonCents: number;
}) {
  if (!Number.isFinite(input.gallons) || input.gallons <= 0)
    throw new Error("Fuel gallons must be greater than zero.");
  if (!Number.isInteger(input.totalCostCents) || input.totalCostCents < 0)
    throw new Error("Fuel total must be a non-negative cent amount.");
  if (
    !Number.isInteger(input.pricePerGallonCents) ||
    input.pricePerGallonCents < 0
  )
    throw new Error("Fuel unit price must be a non-negative cent amount.");
  const expected = input.gallons * input.pricePerGallonCents;
  const tolerance = Math.max(2, Math.ceil(input.gallons));
  if (Math.abs(expected - input.totalCostCents) > tolerance)
    throw new Error("Fuel total and price per gallon are inconsistent.");
}

export function deriveFuelMetrics(
  current: {
    odometerMiles: number | null;
    gallons: number;
    totalCostCents: number;
    fullTank: boolean;
  },
  prior?: { odometerMiles: number | null; fullTank: boolean } | null,
) {
  if (
    !prior?.fullTank ||
    !current.fullTank ||
    prior.odometerMiles == null ||
    current.odometerMiles == null ||
    current.odometerMiles <= prior.odometerMiles
  )
    return {
      milesSincePriorFill: null,
      estimatedMpg: null,
      costPerMileCents: null,
    };
  const milesSincePriorFill = current.odometerMiles - prior.odometerMiles;
  return {
    milesSincePriorFill,
    estimatedMpg: milesSincePriorFill / current.gallons,
    costPerMileCents: current.totalCostCents / milesSincePriorFill,
  };
}

export type MaintenanceState =
  | "Upcoming"
  | "DueSoon"
  | "Due"
  | "Overdue"
  | "Completed"
  | "Skipped"
  | "Cancelled";

export function maintenanceStatus(input: {
  triggerType: MaintenanceTriggerType;
  dueDate?: Date | null;
  dueOdometerMiles?: number | null;
  warningLeadDays: number;
  warningLeadMiles: number;
  currentOdometerMiles?: number | null;
  now?: Date;
}): MaintenanceState {
  const now = input.now ?? new Date();
  const dateDelta =
    input.dueDate == null
      ? null
      : Math.ceil((input.dueDate.getTime() - now.getTime()) / 86_400_000);
  const mileageDelta =
    input.dueOdometerMiles == null || input.currentOdometerMiles == null
      ? null
      : input.dueOdometerMiles - input.currentOdometerMiles;
  const usesDate = ["Date", "CombinedMileageOrDate"].includes(
    input.triggerType,
  );
  const usesMileage = ["Mileage", "CombinedMileageOrDate"].includes(
    input.triggerType,
  );
  if (
    (usesDate && dateDelta != null && dateDelta < 0) ||
    (usesMileage && mileageDelta != null && mileageDelta < 0)
  )
    return "Overdue";
  if ((usesDate && dateDelta === 0) || (usesMileage && mileageDelta === 0))
    return "Due";
  if (
    (usesDate && dateDelta != null && dateDelta <= input.warningLeadDays) ||
    (usesMileage &&
      mileageDelta != null &&
      mileageDelta <= input.warningLeadMiles)
  )
    return "DueSoon";
  return "Upcoming";
}

export function assertNoRecursiveParent(
  assetId: string,
  parentAssetId: string | null | undefined,
  ancestors: ReadonlyMap<string, string | null>,
) {
  let cursor = parentAssetId ?? null;
  const visited = new Set<string>();
  while (cursor) {
    if (cursor === assetId)
      throw new Error("Recursive asset assignment is not allowed.");
    if (visited.has(cursor))
      throw new Error("Asset hierarchy contains a cycle.");
    visited.add(cursor);
    cursor = ancestors.get(cursor) ?? null;
  }
}
