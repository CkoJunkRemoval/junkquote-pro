
import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "./isEstimateLocked";
import {recordEstimateEventInTransaction} from "./estimateEvents";

export interface SaveEstimateProgressInput {
  estimateId: string;
  currentStep: number;
  pricingSubtotal: number;
  pricingLabor: number;
  pricingDisposal: number;
  pricingDiscount: number;
  pricingTotal: number;
  estimatedLaborHours: number | null;
  estimatedLaborCost: number | null;
}

export async function saveEstimateProgress(companyId: string, input: SaveEstimateProgressInput) {
  const { estimateId, ...data } = input;
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    select: { id: true, status: true, signedAt: true },
  });
  if (!estimate) throw new Error("Estimate not found.");
  if (isEstimateLocked(estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  await prisma.$transaction(async tx=>{await tx.estimate.update({ where: { id: estimate.id }, data });await recordEstimateEventInTransaction(tx,{companyId,estimateId:estimate.id,eventType:"Pricing Changed",category:"Pricing",actor:{type:"Employee",displayName:"Team member"},summary:"Team member updated estimate pricing",visibility:"Internal",metadata:{currentStep:data.currentStep,pricingTotal:data.pricingTotal}})});
}
