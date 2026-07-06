import { prisma } from "../prisma";

export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: {
      id,
    },
    include: {
      properties: true,
    },
  });
}