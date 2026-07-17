import { prisma } from "../prisma";

export async function getCustomerProperties(companyId: string, customerId: string) {
  return prisma.property.findMany({
    where: {
      customerId, customer: { companyId },
    },
    orderBy: {
      address: "asc",
    },
  });
}
