"use server";

import { getCustomerProperties } from "@/lib/customers/getCustomerProperties";

export async function getCustomerPropertiesAction(
  customerId: string
) {
  return getCustomerProperties(customerId);
}
