import "server-only";
import { prisma } from "@/lib/prisma";
import type { MembershipRole } from "@/generated/prisma/client";
import { hasFleetCapability } from "@/lib/fleet/permissions";
import { hasWorkforceCapability } from "@/lib/workforce/permissions";
import { hasFinanceCapability } from "@/lib/finance/permissions";
import { hasTaxCapability } from "@/lib/tax/permissions";
import { locationInput, serviceAreaInput } from "./validation";

const roles: MembershipRole[] = ["Owner", "Admin", "Manager", "Office", "Crew"];

export async function getCompanyHub(companyId: string) {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: {
      settings: true,
      businessLocations: { orderBy: [{ active: "desc" }, { name: "asc" }] },
      serviceAreaRules: { orderBy: [{ kind: "asc" }, { value: "asc" }] },
      companyDocuments: { orderBy: { createdAt: "desc" } },
      memberships: { where: { status: "Active" } },
      subscription: true,
      usageMetrics: { orderBy: { date: "desc" }, take: 1 },
      featureFlags: { where: { enabled: true }, orderBy: { key: "asc" } },
      fleetSettings: true,
      timekeepingSettings: true,
    },
  });
  if (!company) throw new Error("Company not found.");
  return company;
}

export function getPermissionOverview() {
  return roles.map((role) => ({
    role,
    companyAdministration: role === "Owner" || role === "Admin",
    workforce: hasWorkforceCapability(role, "workforce.view"),
    fleet: hasFleetCapability(role, "fleet.view"),
    finance: hasFinanceCapability(role, "finance.view"),
    tax: hasTaxCapability(role, "tax.view"),
  }));
}

export function createBusinessLocation(
  companyId: string,
  input: Record<string, FormDataEntryValue>,
) {
  return prisma.businessLocation.create({
    data: { companyId, ...locationInput(input) },
  });
}

export function createServiceArea(
  companyId: string,
  input: Record<string, FormDataEntryValue>,
) {
  return prisma.serviceAreaRule.create({
    data: { companyId, ...serviceAreaInput(input) },
  });
}
