"use server";

import {
  updateCustomer,
  UpdateCustomerInput,
} from "@/lib/customers/updateCustomer";

export async function updateCustomerAction(
  input: UpdateCustomerInput
) {
  return updateCustomer(input);
}