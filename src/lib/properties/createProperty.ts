import { prisma } from "../prisma";

export interface CreatePropertyInput {
  customerId: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  gateCode?: string;
  accessNotes?: string;
}

export async function createProperty(companyId: string, input: CreatePropertyInput) {
  const customer = await prisma.customer.findFirst({ where: { id: input.customerId, companyId }, select: { id: true } });
  if (!customer) throw new Error("Customer not found.");
  return prisma.property.create({
    data: {
      customerId: customer.id,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      gateCode: input.gateCode?.trim() || null,
      accessNotes: input.accessNotes?.trim() || null,
    },
  });
}
