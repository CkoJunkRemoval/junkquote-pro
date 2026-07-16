import { prisma } from "../prisma";

export async function getDraftEstimates(companyId: string) {
  return prisma.estimate.findMany({
    where: {
      companyId,
      status: "Draft",
    },
    include: {
      customer: true,
      property: true,
    },
    orderBy: { updatedAt: "desc" },
  });
}
