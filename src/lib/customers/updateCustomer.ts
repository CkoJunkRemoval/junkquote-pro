import { prisma } from "../prisma";

export interface UpdateCustomerInput {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function updateCustomer(companyId: string, input: UpdateCustomerInput
) {
  const customer = await prisma.customer.findFirst({ where: { id: input.id, companyId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found.");
  return prisma.customer.update({
    where: {
      id: customer.id,
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
