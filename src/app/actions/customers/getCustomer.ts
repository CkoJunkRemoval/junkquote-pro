"use server";

import { getCustomer } from "@/lib/customers/getCustomer";

export async function getCustomerAction(
  customerId: string
) {
  return getCustomer(customerId);
}