import { prisma } from "../prisma";

export interface CreateCustomerInput {
  companyId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function createCustomer(
  input: CreateCustomerInput
) {
  return prisma.customer.create({
    data: {
      companyId: input.companyId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}