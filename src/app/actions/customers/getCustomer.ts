"use server";

import { getCustomer } from "@/lib/customers/getCustomer";

export async function getCustomerAction(
  id: string
) {
  return getCustomer(id);
}