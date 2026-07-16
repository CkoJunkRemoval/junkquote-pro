import { prisma } from "../prisma";

export async function searchCustomer(
  companyId: string,
  search: string
) {
  return prisma.customer.findMany({
    where: {
      companyId,
      OR: [
        {
          firstName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          lastName: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          phone: {
            contains: search,
          },
        },
        {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      ],
    },
    orderBy: {
      lastName: "asc",
    },
    include: {
      properties: true,
    },
  });
}