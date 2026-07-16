import { prisma } from "../prisma";

export interface CreateEstimateInput {
  companyId: string;
  customerId: string;
  propertyId: string;
}

export async function createEstimate(input: CreateEstimateInput) {
  return prisma.estimate.create({
    data: {
      companyId: input.companyId,
      customerId: input.customerId,
      propertyId: input.propertyId,
    },
  });
}
