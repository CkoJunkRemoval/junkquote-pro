
import { prisma } from "../prisma";
import {
  canTransitionEstimateStatus,
  type EstimateWorkflowStatus,
} from "./statusWorkflow";

export type { EstimateWorkflowStatus } from "./statusWorkflow";

export async function updateEstimateStatus(companyId: string, estimateId: string,
  nextStatus: EstimateWorkflowStatus
) {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { status: true },
  });

  if (!estimate) {
    throw new Error("Estimate not found.");
  }

  const currentStatus = estimate.status as EstimateWorkflowStatus;

  if (!canTransitionEstimateStatus(currentStatus, nextStatus)) {
    throw new Error(`Invalid status transition: ${currentStatus} to ${nextStatus}.`);
  }

  return prisma.estimate.update({
    where: { id: estimateId },
    data: { status: nextStatus },
  });
}
