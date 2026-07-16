import { prisma } from "../prisma";

export interface CreateJobSiteInput {
  estimateId: string;
  name: string;
  status?: string;
  customerNotes?: string;
  crewNotes?: string;
  internalNotes?: string;
  sortOrder: number;
}

export async function createJobSite(input: CreateJobSiteInput) {
  return prisma.jobSite.create({
    data: {
      estimateId: input.estimateId,
      name: input.name.trim(),
      status: input.status ?? "not-started",
      customerNotes: input.customerNotes ?? "",
      crewNotes: input.crewNotes ?? "",
      internalNotes: input.internalNotes ?? "",
      sortOrder: input.sortOrder,
    },
  });
}
