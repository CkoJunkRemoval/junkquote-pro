"use server";

import { searchCustomer } from "@/lib/customers/searchCustomer";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function searchCustomerAction(search: string) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return searchCustomer(companyId, search);
}
