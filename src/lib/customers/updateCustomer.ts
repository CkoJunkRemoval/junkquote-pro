import { prisma } from "../prisma";

export interface UpdateCustomerInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function updateCustomer(
  input: UpdateCustomerInput
) {
  return prisma.customer.update({
    where: {
      id: input.id,
    },
    data: {
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      phone: input.phone.trim(),
      email: input.email?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
}