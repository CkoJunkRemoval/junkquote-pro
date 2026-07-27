import type { MembershipRole } from "@/generated/prisma/client";

export type CompanyModule =
  | "dashboard"
  | "operations"
  | "fleet"
  | "estimates"
  | "invoices"
  | "accountsReceivable"
  | "finance"
  | "tax"
  | "customers"
  | "workforce"
  | "myTime"
  | "teamTime"
  | "properties"
  | "jobs"
  | "field"
  | "servicePlans"
  | "schedule"
  | "dispatch"
  | "communications"
  | "pricing"
  | "analytics"
  | "pricingIntelligence"
  | "companyHub"
  | "billing";

export type CompanyAccessSubject = {
  role: MembershipRole;
  billingAdmin?: boolean;
};

const ownerAndAdmin = new Set<MembershipRole>(["Owner", "Admin"]);
const officeOperations = new Set<MembershipRole>([
  "Owner",
  "Admin",
  "Manager",
  "Office",
]);
const allWorkers = new Set<MembershipRole>([
  "Owner",
  "Admin",
  "Manager",
  "Office",
  "Crew",
]);

export function hasCompanyModuleAccess(
  subject: CompanyAccessSubject,
  module: CompanyModule,
) {
  const { role } = subject;
  switch (module) {
    case "dashboard":
    case "myTime":
      return allWorkers.has(role);
    case "field":
      return role === "Crew" || officeOperations.has(role);
    case "operations":
    case "estimates":
    case "invoices":
    case "accountsReceivable":
    case "customers":
    case "properties":
    case "jobs":
    case "servicePlans":
    case "schedule":
    case "dispatch":
    case "communications":
      return officeOperations.has(role);
    case "fleet":
      return allWorkers.has(role);
    case "workforce":
    case "teamTime":
      return role !== "Crew";
    case "pricing":
      return officeOperations.has(role);
    case "analytics":
      return role === "Owner" || role === "Admin" || role === "Manager";
    case "finance":
    case "tax":
    case "pricingIntelligence":
    case "companyHub":
      return ownerAndAdmin.has(role);
    case "billing":
      return ownerAndAdmin.has(role) || subject.billingAdmin === true;
  }
}

export function visibleCompanyModules(subject: CompanyAccessSubject) {
  const modules: CompanyModule[] = [
    "dashboard", "operations", "fleet", "estimates", "invoices",
    "accountsReceivable", "finance", "tax", "customers", "workforce",
    "myTime", "teamTime", "properties", "jobs", "field", "servicePlans",
    "schedule", "dispatch", "communications", "pricing", "analytics",
    "pricingIntelligence", "companyHub", "billing",
  ];
  return modules.filter((module) => hasCompanyModuleAccess(subject, module));
}
