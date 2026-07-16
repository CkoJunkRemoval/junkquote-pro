import { prisma } from "../prisma";

export async function getEstimate(estimateId: string) {
  return prisma.estimate.findUnique({
    where: { id: estimateId },
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
