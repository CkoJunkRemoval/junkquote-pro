"use server";

import { listCustomers, type ListCustomersInput } from "@/lib/customers/listCustomers";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function listCustomersAction(input: ListCustomersInput = {}) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return listCustomers(companyId, input);
}
