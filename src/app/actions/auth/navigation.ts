"use server";

import { visibleCompanyModules } from "@/lib/auth/companyCapabilities";
import { requireTenantContext } from "@/lib/auth/tenant";

export async function getVisibleNavigationModules() {
  const tenant = await requireTenantContext();
  return visibleCompanyModules({
    role: tenant.role,
    billingAdmin: tenant.membership.billingAdmin,
  });
}
