import type { MembershipRole } from "@/generated/prisma/client";

const estimateCreateRoles = new Set<MembershipRole>([
  "Owner",
  "Admin",
  "Manager",
  "Office",
]);

export function canCreateEstimateForRole(role: MembershipRole) {
  return estimateCreateRoles.has(role);
}
