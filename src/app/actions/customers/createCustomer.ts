"use server";

import { createCustomer } from "@/lib/customers/createCustomer";
import { requireCompanyRole } from "@/lib/auth/tenant";

export interface CreateCustomerActionInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function createCustomerAction(
  input: CreateCustomerActionInput
) {
  const { companyId } = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  return createCustomer(companyId, input);
}
