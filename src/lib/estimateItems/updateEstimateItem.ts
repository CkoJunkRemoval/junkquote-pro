import { prisma } from "../prisma";

export interface UpdateEstimateItemInput {
  id: string;
  quantity?: number;
  notes?: string;
  priceOverride?: number | null;
  sortOrder?: number;
}

export async function updateEstimateItem(input: UpdateEstimateItemInput) {
  const { id, ...data } = input;

  return prisma.estimateItem.update({
    where: { id },
    data,
  });
}
