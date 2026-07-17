import { prisma } from "../prisma";

export async function getCustomer(companyId: string, id: string) {
  return prisma.customer.findFirst({
    where: { id, companyId },
    include: {
      properties: true,
    },
  });
}
