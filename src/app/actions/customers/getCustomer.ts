"use server";

import { getCustomer } from "@/lib/customers/getCustomer";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function getCustomerAction(
  id: string
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return getCustomer(companyId, id);
}
