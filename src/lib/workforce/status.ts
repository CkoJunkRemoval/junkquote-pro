import type { EmployeeStatus } from "@/generated/prisma/client";

const transitions: Record<EmployeeStatus, readonly EmployeeStatus[]> = {
  Onboarding: ["Active", "Inactive", "Terminated"],
  Active: ["Leave", "Suspended", "Inactive", "Terminated"],
  Leave: ["Active", "Suspended", "Terminated"],
  Suspended: ["Active", "Inactive", "Terminated"],
  Terminated: ["Onboarding", "Active"],
  Inactive: ["Onboarding", "Active", "Terminated"],
};

export function canTransitionWorkforceStatus(
  current: EmployeeStatus,
  next: EmployeeStatus,
) {
  return current === next || transitions[current].includes(next);
}

export function assertWorkforceStatusTransition(
  current: EmployeeStatus,
  next: EmployeeStatus,
) {
  if (!canTransitionWorkforceStatus(current, next)) {
    throw new Error(`Workforce member cannot move from ${current} to ${next}.`);
  }
}

