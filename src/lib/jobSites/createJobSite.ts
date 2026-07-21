import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";

export interface CreateJobSiteInput {
  estimateId: string;
  name: string;
  status?: string;
  customerNotes?: string;
  crewNotes?: string;
  internalNotes?: string;
  sortOrder: number;
}

export async function createJobSite(companyId: string, input: CreateJobSiteInput) {
  const estimate = await prisma.estimate.findFirst({ where: { id: input.estimateId, companyId }, select: { status: true, signedAt: true } });
  if (!estimate) throw new Error("Estimate not found.");
  if (isEstimateLocked(estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
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
