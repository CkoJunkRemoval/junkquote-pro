import type { MembershipRole } from "@/generated/prisma/client";
export function analyticsAccess(role: MembershipRole) {
  if (role === "Crew")
    return { allowed: false, showProfit: false, scope: "none" as const };
  if (role === "Office")
    return { allowed: true, showProfit: false, scope: "operational" as const };
  return {
    allowed: true,
    showProfit: true,
    scope: role === "Manager" ? ("operational" as const) : ("full" as const),
  };
}
