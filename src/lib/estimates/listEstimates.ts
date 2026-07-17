import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";

export type EstimateListStatus = "Draft" | "Ready" | "Sent" | "Approved" | "Declined" | "Scheduled" | "Completed" | "Archived";
export type EstimateListSort = "updated_desc" | "updated_asc" | "total_desc" | "total_asc";

export interface ListEstimatesInput { status?: EstimateListStatus; search?: string; sort?: EstimateListSort; page?: number; pageSize?: number; }

export function normalizeEstimateListInput(input: ListEstimatesInput) {
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const page = Math.max(1, input.page ?? 1);
  const search = input.search?.trim();
  return { page, pageSize, skip: (page - 1) * pageSize, status: input.status, search, sort: input.sort ?? "updated_desc" };
}

export function buildEstimateListWhere(companyId: string,
  query: ReturnType<typeof normalizeEstimateListInput>
): Prisma.EstimateWhereInput {
  const customerNameTerms = query.search?.split(/\s+/) ?? [];

  return {
    companyId,
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { id: { contains: query.search, mode: "insensitive" } },
            {
              customer: {
                AND: customerNameTerms.map((term) => ({
                  OR: [
                    { firstName: { contains: term, mode: "insensitive" } },
                    { lastName: { contains: term, mode: "insensitive" } },
                  ],
                })),
              },
            },
            {
              property: {
                address: { contains: query.search, mode: "insensitive" },
              },
            },
          ],
        }
      : {}),
  };
}

export function buildEstimateListOrderBy(
  sort: EstimateListSort
): Prisma.EstimateOrderByWithRelationInput {
  if (sort === "updated_asc") return { updatedAt: "asc" };
  if (sort === "total_desc") return { pricingTotal: "desc" };
  if (sort === "total_asc") return { pricingTotal: "asc" };
  return { updatedAt: "desc" };
}

export async function listEstimates(companyId: string, input: ListEstimatesInput = {}) {
  const query = normalizeEstimateListInput(input);
  const where = buildEstimateListWhere(companyId, query);
  const orderBy = buildEstimateListOrderBy(query.sort);
  const [estimates, total] = await prisma.$transaction([
    prisma.estimate.findMany({ where, orderBy, skip: query.skip, take: query.pageSize, select: { id: true, status: true, pricingTotal: true, createdAt: true, updatedAt: true, customer: { select: { firstName: true, lastName: true } }, property: { select: { address: true, city: true, state: true, zip: true } } } }),
    prisma.estimate.count({ where }),
  ]);
  return { estimates, total, page: query.page, pageSize: query.pageSize };
}
