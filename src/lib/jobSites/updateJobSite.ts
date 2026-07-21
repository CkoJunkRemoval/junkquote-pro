import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";

export interface UpdateJobSiteInput {
  id: string;
  name?: string;
  status?: string;
  customerNotes?: string;
  crewNotes?: string;
  internalNotes?: string;
  sortOrder?: number;
}

export async function updateJobSite(companyId: string, input: UpdateJobSiteInput) {
  const { id, ...data } = input;
  const site = await prisma.jobSite.findFirst({ where: { id, estimate: { companyId } }, select: { estimate: { select: { status: true, signedAt: true } } } });
  if (!site) throw new Error("Job site not found.");
  if (isEstimateLocked(site.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.jobSite.update({
    where: { id },
    data,
  });
}
