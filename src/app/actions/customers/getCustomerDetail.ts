"use server";

import { getCustomerDetail } from "@/lib/customers/getCustomerDetail";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getCustomerDetailAction(customerId: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getCustomerDetail(companyId, customerId);
}
