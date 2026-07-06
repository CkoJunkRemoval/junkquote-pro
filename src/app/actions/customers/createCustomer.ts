"use server";

import { createCustomer } from "@/lib/customers/createCustomer";

export interface CreateCustomerActionInput {
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function createCustomerAction(
  input: CreateCustomerActionInput
) {
  return createCustomer(input);
}