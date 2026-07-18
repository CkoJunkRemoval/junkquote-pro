import type { MembershipRole } from "@/generated/prisma/client";
export type SmartPricingCapability = "configure" | "use" | "view";
export function canAccessSmartPricing(role: MembershipRole, capability: SmartPricingCapability) {
  if (capability === "configure") return role === "Owner" || role === "Admin";
  if (capability === "use") return role === "Owner" || role === "Admin" || role === "Manager";
  return role !== "Crew";
}
