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
  console.log("=== CREATE CUSTOMER ACTION ===");
  console.log(input);

  try {
    const customer = await createCustomer(input);

    console.log("Customer created:");
    console.log(customer);

    return customer;
  } catch (error) {
    console.error("CREATE CUSTOMER FAILED:");
    console.error(error);

    throw error;
  }
}