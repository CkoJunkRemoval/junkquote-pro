import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";

export type CustomerListSort =
  | "name_asc"
  | "name_desc"
  | "created_desc"
  | "created_asc"
  | "estimate_count_desc";

export interface ListCustomersInput {
  search?: string;
  sort?: CustomerListSort;
  page?: number;
  pageSize?: number;
}

export function normalizeCustomerListInput(input: ListCustomersInput) {
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const page = Math.max(1, input.page ?? 1);

  return {
    page,
    pageSize,
    skip: (page - 1) * pageSize,
    search: input.search?.trim(),
    sort: input.sort ?? "name_asc",
  };
}

export function buildCustomerListWhere(companyId: string,
  query: ReturnType<typeof normalizeCustomerListInput>
): Prisma.CustomerWhereInput {
  const nameTerms = query.search?.split(/\s+/) ?? [];

  return {
    companyId,
    ...(query.search
      ? {
          OR: [
            {
              AND: nameTerms.map((term) => ({
                OR: [
                  { firstName: { contains: term, mode: "insensitive" } },
                  { lastName: { contains: term, mode: "insensitive" } },
                ],
              })),
            },
            { phone: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

export function buildCustomerListOrderBy(
  sort: CustomerListSort
): Prisma.CustomerOrderByWithRelationInput | Prisma.CustomerOrderByWithRelationInput[] {
  if (sort === "name_desc") return [{ firstName: "desc" }, { lastName: "desc" }];
  if (sort === "created_desc") return { createdAt: "desc" };
  if (sort === "created_asc") return { createdAt: "asc" };
  if (sort === "estimate_count_desc") return { estimates: { _count: "desc" } };
  return [{ firstName: "asc" }, { lastName: "asc" }];
}

export async function listCustomers(companyId: string, input: ListCustomersInput = {}) {
  const query = normalizeCustomerListInput(input);
  const where = buildCustomerListWhere(companyId, query);
  const [customers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: buildCustomerListOrderBy(query.sort),
      skip: query.skip,
      take: query.pageSize,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { properties: true, estimates: true } },
        estimates: {
          take: 1,
          orderBy: { updatedAt: "desc" },
          select: { updatedAt: true },
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers: customers.map(({ _count, estimates, ...customer }) => ({
      ...customer,
      propertyCount: _count.properties,
      estimateCount: _count.estimates,
      latestEstimateAt: estimates[0]?.updatedAt ?? null,
    })),
    total,
    page: query.page,
    pageSize: query.pageSize,
  };
}
