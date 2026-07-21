import { prisma } from "../prisma";

export async function getEstimateManagementDetail(companyId: string, estimateId: string) {
  return prisma.estimate.findFirst({
    where: {
      id: estimateId,
      companyId,
    },
    select: {
      id: true,
      displayNumber: true,
      revisionNumber: true,
      status: true,
      signedAt: true,
      pricingSubtotal: true,
      pricingLabor: true,
      pricingDisposal: true,
      pricingDiscount: true,
      pricingTotal: true,
      createdAt: true,
      updatedAt: true,
      customer: { select: { firstName: true, lastName: true } },
      property: { select: { address: true, city: true, state: true, zip: true } },
      jobSites: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          customerNotes: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, category: true, quantity: true, notes: true, priceOverride: true },
          },
        },
      },
      revisionPhotos: { select: { id: true } },
    },
  });
}
