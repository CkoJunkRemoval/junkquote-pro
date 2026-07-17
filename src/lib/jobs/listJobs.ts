import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";

export type JobListStatus = "Unscheduled" | "Scheduled" | "InProgress" | "Completed" | "Cancelled";
export type JobListSort = "scheduled_asc" | "scheduled_desc" | "updated_desc" | "updated_asc";
export interface ListJobsInput { status?: JobListStatus; search?: string; sort?: JobListSort; page?: number; pageSize?: number; crewId?: string; unassigned?: boolean; }

export function normalizeJobListInput(input: ListJobsInput) {
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const page = Math.max(1, input.page ?? 1);
  return { page, pageSize, skip: (page - 1) * pageSize, status: input.status, search: input.search?.trim(), sort: input.sort ?? "scheduled_asc", crewId: input.crewId, unassigned: input.unassigned };
}

export function buildJobListWhere(companyId: string, query: ReturnType<typeof normalizeJobListInput>): Prisma.JobWhereInput {
  const nameTerms = query.search?.split(/\s+/) ?? [];
  return {
    companyId,
    ...(query.crewId ? { assignments: { some: { crewId: query.crewId } } } : {}),
    ...(query.unassigned ? { assignments: { none: {} } } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.search ? { OR: [
      { estimateId: { contains: query.search, mode: "insensitive" } },
      { customer: { AND: nameTerms.map((term) => ({ OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }] })) } },
      { property: { address: { contains: query.search, mode: "insensitive" } } },
    ] } : {}),
  };
}

export function buildJobListOrderBy(sort: JobListSort): Prisma.JobOrderByWithRelationInput | Prisma.JobOrderByWithRelationInput[] {
  if (sort === "scheduled_desc") return [{ scheduledStart: "desc" }, { updatedAt: "desc" }];
  if (sort === "updated_desc") return { updatedAt: "desc" };
  if (sort === "updated_asc") return { updatedAt: "asc" };
  return [{ scheduledStart: "asc" }, { updatedAt: "desc" }];
}

export async function listJobs(companyId: string, input: ListJobsInput = {}) {
  const query = normalizeJobListInput(input);
  if (query.crewId && !await prisma.crew.findFirst({ where: { id: query.crewId, companyId }, select: { id: true } })) throw new Error("Crew not found.");
  const where = buildJobListWhere(companyId, query);
  const [jobs, total] = await prisma.$transaction([
    prisma.job.findMany({ where, orderBy: buildJobListOrderBy(query.sort), skip: query.skip, take: query.pageSize, select: { id: true, estimateId: true, status: true, scheduledStart: true, scheduledEnd: true, updatedAt: true, customer: { select: { firstName: true, lastName: true } }, property: { select: { address: true, city: true, state: true, zip: true } }, estimate: { select: { pricingTotal: true } }, assignments: { select: { employee: { select: { firstName: true, lastName: true } }, crew: { select: { name: true, color: true } } } } } }),
    prisma.job.count({ where }),
  ]);
  return { jobs, total, page: query.page, pageSize: query.pageSize };
}
