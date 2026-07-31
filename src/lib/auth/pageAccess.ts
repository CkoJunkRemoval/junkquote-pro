import "server-only";
import { forbidden } from "next/navigation";
import {
  hasCompanyModuleAccess,
  type CompanyModule,
} from "./companyCapabilities";
import { requireTenantContext } from "./tenant";
import { canAccessFeature } from "@/lib/billing/entitlements";
import type { BillingFeature } from "@/lib/billing/config";

const paidModuleFeatures: Partial<Record<CompanyModule, BillingFeature>> = {
  operations: "operations", fleet: "fleet", finance: "finance", tax: "taxCenter",
  teamTime: "timekeeping", dispatch: "scheduling", servicePlans: "automation",
  analytics: "reporting", pricingIntelligence: "pricingIntelligence",
};

export async function requireCompanyModulePage(module: CompanyModule) {
  const tenant = await requireTenantContext();
  if (
    !hasCompanyModuleAccess(
      {
        role: tenant.role,
        billingAdmin: tenant.membership.billingAdmin,
      },
      module,
    )
  ) {
    forbidden();
  }
  const paidFeature = paidModuleFeatures[module];
  if (paidFeature && !(await canAccessFeature(tenant.companyId, paidFeature))) forbidden();
  return tenant;
}
