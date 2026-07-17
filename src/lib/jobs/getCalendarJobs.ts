import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "../prisma";
import type { JobWorkflowStatus } from "./statusWorkflow";

export interface GetCalendarJobsInput {
  start: Date;
  end: Date;
  statuses?: JobWorkflowStatus[];
  search?: string;
  crewId?: string;
}

const calendarSelect = {
  id: true,
  estimateId: true,
  status: true,
  scheduledStart: true,
  scheduledEnd: true,
  updatedAt: true,
  customer: { select: { firstName: true, lastName: true } },
  property: { select: { address: true, city: true, state: true, zip: true } },
  estimate: { select: { pricingTotal: true } },
  assignments: { select: { employee: { select: { id: true, firstName: true, lastName: true } }, crew: { select: { id: true, name: true, color: true } } } },
} satisfies Prisma.JobSelect;

export function buildCalendarJobWhere(companyId: string, input: GetCalendarJobsInput): Prisma.JobWhereInput {
  const search = input.search?.trim();
  const nameTerms = search?.split(/\s+/) ?? [];
  return {
    companyId,
    ...(input.crewId ? { assignments: { some: { crewId: input.crewId } } } : {}),
    scheduledStart: { gte: input.start, lt: input.end },
    status: { in: input.statuses?.length ? input.statuses : ["Scheduled", "InProgress"] },
    ...(search ? { OR: [
      { customer: { AND: nameTerms.map((term) => ({ OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }] })) } },
      { property: { address: { contains: search, mode: "insensitive" } } },
    ] } : {}),
  };
}

export async function getCalendarJobs(companyId: string, input: GetCalendarJobsInput) {
  if (input.end <= input.start) throw new Error("Calendar end date must be after the start date.");
  if (input.crewId && !await prisma.crew.findFirst({ where: { id: input.crewId, companyId }, select: { id: true } })) throw new Error("Crew not found.");
  return prisma.job.findMany({
    where: buildCalendarJobWhere(companyId, input),
    orderBy: { scheduledStart: "asc" },
    take: 500,
    select: calendarSelect,
  });
}

export async function getUnscheduledCalendarJobs(companyId: string, search?: string) {
  const normalizedSearch = search?.trim();
  const nameTerms = normalizedSearch?.split(/\s+/) ?? [];
  return prisma.job.findMany({
    where: {
      companyId,
      status: "Unscheduled",
      ...(normalizedSearch ? { OR: [
        { customer: { AND: nameTerms.map((term) => ({ OR: [{ firstName: { contains: term, mode: "insensitive" } }, { lastName: { contains: term, mode: "insensitive" } }] })) } },
        { property: { address: { contains: normalizedSearch, mode: "insensitive" } } },
      ] } : {}),
    },
    orderBy: { updatedAt: "desc" },
    take: 100,
    select: calendarSelect,
  });
}
