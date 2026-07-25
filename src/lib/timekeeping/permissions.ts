import type { MembershipRole } from "@/generated/prisma/client";

export type TimeCapability =
  | "time.self.clock"
  | "time.self.view"
  | "time.self.requestCorrection"
  | "time.team.view"
  | "time.team.manage"
  | "time.timesheet.submit"
  | "time.timesheet.approve"
  | "time.payPeriod.manage"
  | "time.export"
  | "time.lock.manage";

const roleCapabilities: Record<MembershipRole, ReadonlySet<TimeCapability>> = {
  Owner: new Set([
    "time.self.clock",
    "time.self.view",
    "time.self.requestCorrection",
    "time.team.view",
    "time.team.manage",
    "time.timesheet.submit",
    "time.timesheet.approve",
    "time.payPeriod.manage",
    "time.export",
    "time.lock.manage",
  ]),
  Admin: new Set([
    "time.self.clock",
    "time.self.view",
    "time.self.requestCorrection",
    "time.team.view",
    "time.team.manage",
    "time.timesheet.submit",
    "time.timesheet.approve",
    "time.payPeriod.manage",
    "time.export",
    "time.lock.manage",
  ]),
  Manager: new Set([
    "time.self.clock",
    "time.self.view",
    "time.self.requestCorrection",
    "time.team.view",
    "time.team.manage",
    "time.timesheet.submit",
    "time.timesheet.approve",
  ]),
  Office: new Set([
    "time.self.clock",
    "time.self.view",
    "time.self.requestCorrection",
    "time.team.view",
    "time.team.manage",
    "time.timesheet.submit",
  ]),
  Crew: new Set([
    "time.self.clock",
    "time.self.view",
    "time.self.requestCorrection",
    "time.timesheet.submit",
  ]),
};

export function hasTimeCapability(
  role: MembershipRole,
  capability: TimeCapability,
) {
  return roleCapabilities[role].has(capability);
}

export function requireTimeCapability(
  role: MembershipRole,
  capability: TimeCapability,
) {
  if (!hasTimeCapability(role, capability))
    throw new Error(
      "You do not have permission to perform this timekeeping action.",
    );
}
