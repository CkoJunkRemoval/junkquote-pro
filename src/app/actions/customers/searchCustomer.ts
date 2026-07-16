"use server";

import { searchCustomer } from "@/lib/customers/searchCustomer";

export async function searchCustomerAction(
  companyId: string,
  search: string
) {
  return searchCustomer(companyId, search);
}