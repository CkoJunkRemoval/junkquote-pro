import { prisma } from "../prisma";

export async function getCustomerProperties(customerId: string) {
  return prisma.property.findMany({
    where: {
      customerId,
    },
    orderBy: {
      address: "asc",
    },
  });
}
