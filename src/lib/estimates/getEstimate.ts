import { prisma } from "../prisma";

export async function getEstimate(companyId: string, estimateId: string) {
  return prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: {
      pricingProfile: true,
      customer: true,
      property: true,
      appliedPricingRules: { orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }] },
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
