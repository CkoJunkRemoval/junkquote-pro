import { prisma } from "../prisma";

export async function deleteEstimateItem(id: string) {
  return prisma.estimateItem.delete({
    where: { id },
  });
}
