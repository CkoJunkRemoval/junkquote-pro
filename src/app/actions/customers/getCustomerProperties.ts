"use server";

import { getCustomerProperties } from "@/lib/customers/getCustomerProperties";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getCustomerPropertiesAction(
  customerId: string
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getCustomerProperties(companyId, customerId);
}
