import type { MembershipRole } from "@/generated/prisma/client";

export type FleetCapability =
  | "fleet.view"
  | "fleet.manage"
  | "fleet.remove"
  | "fleet.assign"
  | "fleet.mileage.log"
  | "fleet.mileage.correct"
  | "fleet.fuel.log"
  | "fleet.fuel.manage"
  | "fleet.maintenance.view"
  | "fleet.maintenance.manage"
  | "fleet.inspections.perform"
  | "fleet.inspections.manage"
  | "fleet.documents.view"
  | "fleet.documents.manage"
  | "fleet.costs.view"
  | "fleet.reports.view";

const all: FleetCapability[] = [
  "fleet.view",
  "fleet.manage",
  "fleet.remove",
  "fleet.assign",
  "fleet.mileage.log",
  "fleet.mileage.correct",
  "fleet.fuel.log",
  "fleet.fuel.manage",
  "fleet.maintenance.view",
  "fleet.maintenance.manage",
  "fleet.inspections.perform",
  "fleet.inspections.manage",
  "fleet.documents.view",
  "fleet.documents.manage",
  "fleet.costs.view",
  "fleet.reports.view",
];

const capabilities: Record<MembershipRole, ReadonlySet<FleetCapability>> = {
  Owner: new Set(all),
  Admin: new Set(all),
  Manager: new Set([
    "fleet.view",
    "fleet.manage",
    "fleet.assign",
    "fleet.mileage.log",
    "fleet.mileage.correct",
    "fleet.fuel.log",
    "fleet.fuel.manage",
    "fleet.maintenance.view",
    "fleet.maintenance.manage",
    "fleet.inspections.perform",
    "fleet.inspections.manage",
    "fleet.documents.view",
    "fleet.documents.manage",
    "fleet.reports.view",
  ]),
  Office: new Set([
    "fleet.view",
    "fleet.assign",
    "fleet.mileage.log",
    "fleet.fuel.log",
    "fleet.maintenance.view",
    "fleet.inspections.perform",
    "fleet.documents.view",
  ]),
  Crew: new Set([
    "fleet.view",
    "fleet.mileage.log",
    "fleet.inspections.perform",
  ]),
};

export function hasFleetCapability(
  role: MembershipRole,
  capability: FleetCapability,
) {
  return capabilities[role].has(capability);
}

export function requireFleetCapability(
  role: MembershipRole,
  capability: FleetCapability,
) {
  if (!hasFleetCapability(role, capability))
    throw new Error("You do not have permission to perform this fleet action.");
}
