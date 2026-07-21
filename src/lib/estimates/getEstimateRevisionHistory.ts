import { prisma } from "../prisma";

export async function getEstimateRevisionHistory(companyId: string, estimateId: string) {
  const estimate = await prisma.estimate.findFirst({ where: { id: estimateId, companyId }, select: { id: true, revisionRootId: true } });
  if (!estimate) return null;
  const rootId = estimate.revisionRootId ?? estimate.id;
  const revisions = await prisma.estimate.findMany({
    where: { companyId, OR: [{ id: rootId }, { revisionRootId: rootId }] },
    orderBy: { revisionNumber: "asc" },
    select: { id: true, displayNumber: true, revisionNumber: true, status: true, signedAt: true, createdAt: true },
  });
  return { rootId, currentId: estimate.id, revisions };
}
