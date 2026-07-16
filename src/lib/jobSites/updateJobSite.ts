import { prisma } from "../prisma";

export interface UpdateJobSiteInput {
  id: string;
  name?: string;
  status?: string;
  customerNotes?: string;
  crewNotes?: string;
  internalNotes?: string;
  sortOrder?: number;
}

export async function updateJobSite(input: UpdateJobSiteInput) {
  const { id, ...data } = input;

  return prisma.jobSite.update({
    where: { id },
    data,
  });
}
