import { prisma } from "../prisma";

export interface CreateEstimateItemInput {
  jobSiteId: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string;
  priceOverride?: number;
  sortOrder: number;
}

export async function createEstimateItem(input: CreateEstimateItemInput) {
  return prisma.estimateItem.create({
    data: {
      jobSiteId: input.jobSiteId,
      itemId: input.itemId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      notes: input.notes ?? "",
      priceOverride: input.priceOverride,
      sortOrder: input.sortOrder,
    },
  });
}
