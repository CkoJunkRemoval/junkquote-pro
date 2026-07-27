import "server-only";
import { forbidden } from "next/navigation";
import {
  hasCompanyModuleAccess,
  type CompanyModule,
} from "./companyCapabilities";
import { requireTenantContext } from "./tenant";

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
  return tenant;
}
