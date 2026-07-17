import { prisma } from "../prisma";

export interface CreateCustomerInput {
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function createCustomer(companyId: string, input: CreateCustomerInput
) {
  return prisma.customer.create({
    data: {
      companyId,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}
