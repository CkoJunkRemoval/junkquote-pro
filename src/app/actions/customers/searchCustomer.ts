"use server";

import { searchCustomers } from "@/lib/customers/searchCustomer";

export interface SearchCustomersActionInput {
  companyId: string;
  search: string;
}

export async function searchCustomersAction(
  input: SearchCustomersActionInput
) {
  const search = input.search.trim();

  if (search.length === 0) {
    return [];
  }

  return searchCustomers(
    input.companyId,
    search
  );
}