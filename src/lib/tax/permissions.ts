import type { MembershipRole } from "@/generated/prisma/client";

export type TaxCapability =
  | "tax.view"
  | "tax.documents.view"
  | "tax.documents.manage"
  | "tax.exports"
  | "tax.periods.manage"
  | "tax.checklist.manage";

const all = new Set<TaxCapability>([
  "tax.view",
  "tax.documents.view",
  "tax.documents.manage",
  "tax.exports",
  "tax.periods.manage",
  "tax.checklist.manage",
]);

export function hasTaxCapability(role: MembershipRole, capability: TaxCapability) {
  return (role === "Owner" || role === "Admin") && all.has(capability);
}

export function requireTaxCapability(role: MembershipRole, capability: TaxCapability) {
  if (!hasTaxCapability(role, capability))
    throw new Error("You do not have permission to perform this tax-center action.");
}
