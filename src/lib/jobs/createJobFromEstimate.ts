import { prisma } from "../prisma";

export async function createJobFromEstimate(companyId: string, estimateId: string) {
  return prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findFirst({
      where: { id: estimateId, companyId },
      select: { id: true, companyId: true, customerId: true, propertyId: true, status: true },
    });

    if (!estimate) throw new Error("Estimate not found.");
    if (estimate.status !== "Approved") throw new Error("Only approved estimates can be converted to jobs.");

    const existingJob = await tx.job.findUnique({ where: { estimateId } });
    if (existingJob) throw new Error("A job already exists for this estimate.");

    return tx.job.create({
      data: {
        companyId: estimate.companyId,
        estimateId: estimate.id,
        customerId: estimate.customerId,
        propertyId: estimate.propertyId,
      },
    });
  });
}
