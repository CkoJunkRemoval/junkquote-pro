import type { MembershipRole } from "@/generated/prisma/client";

export type FinanceCapability =
  | "finance.view"
  | "finance.expenses.view"
  | "finance.expenses.manage"
  | "finance.expenses.approve"
  | "finance.receipts.view"
  | "finance.receipts.manage"
  | "finance.vendors.view"
  | "finance.vendors.manage"
  | "finance.recurring.manage"
  | "finance.jobCosting.view"
  | "finance.costs.view"
  | "finance.incomeAdjustments.manage"
  | "finance.exports"
  | "finance.periods.manage"
  | "finance.periods.unlock";

const all: FinanceCapability[] = [
  "finance.view",
  "finance.expenses.view",
  "finance.expenses.manage",
  "finance.expenses.approve",
  "finance.receipts.view",
  "finance.receipts.manage",
  "finance.vendors.view",
  "finance.vendors.manage",
  "finance.recurring.manage",
  "finance.jobCosting.view",
  "finance.costs.view",
  "finance.incomeAdjustments.manage",
  "finance.exports",
  "finance.periods.manage",
  "finance.periods.unlock",
];

const capabilities: Record<MembershipRole, ReadonlySet<FinanceCapability>> = {
  Owner: new Set(all),
  Admin: new Set(all),
  Manager: new Set(),
  Office: new Set(),
  Crew: new Set(),
};

export function hasFinanceCapability(
  role: MembershipRole,
  capability: FinanceCapability,
) {
  return capabilities[role].has(capability);
}

export function requireFinanceCapability(
  role: MembershipRole,
  capability: FinanceCapability,
) {
  if (!hasFinanceCapability(role, capability)) {
    throw new Error("You do not have permission to perform this finance action.");
  }
}
