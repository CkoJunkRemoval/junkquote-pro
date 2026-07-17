"use server";

import {
  updateCustomer,
  UpdateCustomerInput,
} from "@/lib/customers/updateCustomer";
import { requireCompanyRole } from "@/lib/auth/tenant";

export async function updateCustomerAction(
  input: UpdateCustomerInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return updateCustomer(companyId, input);
}
