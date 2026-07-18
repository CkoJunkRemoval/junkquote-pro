import type { MembershipRole } from "@/generated/prisma/client";
export function canAdministerServicePlans(role: MembershipRole) { return role === "Owner" || role === "Admin" || role === "Manager" || role === "Office"; }
