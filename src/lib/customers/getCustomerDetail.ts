import { prisma } from "../prisma";

export async function getCustomerDetail(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      properties: {
        orderBy: { address: "asc" },
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          gateCode: true,
          accessNotes: true,
          createdAt: true,
        },
      },
      estimates: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          status: true,
          pricingTotal: true,
          updatedAt: true,
          property: { select: { address: true, city: true, state: true, zip: true } },
        },
      },
    },
  });
}
