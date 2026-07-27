import type { MembershipRole } from "@/generated/prisma/client";

export type WorkforceCapability =
  | "workforce.view"
  | "workforce.manage"
  | "workforce.compensation.view"
  | "workforce.compensation.manage"
  | "workforce.documents.view"
  | "workforce.documents.manage"
  | "workforce.onboarding.manage"
  | "workforce.credentials.manage";

const capabilities: Record<MembershipRole, ReadonlySet<WorkforceCapability>> = {
  Owner: new Set([
    "workforce.view",
    "workforce.manage",
    "workforce.compensation.view",
    "workforce.compensation.manage",
    "workforce.documents.view",
    "workforce.documents.manage",
    "workforce.onboarding.manage",
    "workforce.credentials.manage",
  ]),
  Admin: new Set([
    "workforce.view",
    "workforce.manage",
    "workforce.compensation.view",
    "workforce.compensation.manage",
    "workforce.documents.view",
    "workforce.documents.manage",
    "workforce.onboarding.manage",
    "workforce.credentials.manage",
  ]),
  Manager: new Set([
    "workforce.view",
    "workforce.manage",
    "workforce.onboarding.manage",
    "workforce.credentials.manage",
  ]),
  Office: new Set([
    "workforce.view",
    "workforce.manage",
    "workforce.onboarding.manage",
    "workforce.credentials.manage",
  ]),
  Crew: new Set([]),
};

export function hasWorkforceCapability(
  role: MembershipRole,
  capability: WorkforceCapability,
) {
  return capabilities[role].has(capability);
}

export function requireWorkforceCapability(
  role: MembershipRole,
  capability: WorkforceCapability,
) {
  if (!hasWorkforceCapability(role, capability)) {
    throw new Error("You do not have permission to access this workforce record.");
  }
}
