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

export async function createProperty(input: CreatePropertyInput) {
  return prisma.property.create({
    data: {
      customerId: input.customerId,
      address: input.address.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      zip: input.zip.trim(),
      gateCode: input.gateCode?.trim() || null,
      accessNotes: input.accessNotes?.trim() || null,
    },
  });
}
