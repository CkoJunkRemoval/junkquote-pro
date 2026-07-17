import { prisma } from "../prisma";

export async function getEstimate(companyId: string, estimateId: string) {
  return prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      customer: true,
      property: true,
      jobSites: {
        orderBy: { sortOrder: "asc" },
        include: {
          items: {
            orderBy: { sortOrder: "asc" },
          },
        },
      },
    },
  });
}
