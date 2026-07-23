import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";
import {recordEstimateEventInTransaction} from "../estimates/estimateEvents";

export interface UpdateEstimateItemInput {
  id: string;
  quantity?: number;
  notes?: string;
  priceOverride?: number | null;
  sortOrder?: number;
}

export async function updateEstimateItem(companyId: string, input: UpdateEstimateItemInput) {
  const { id, ...data } = input;
  const item = await prisma.estimateItem.findFirst({ where: { id, jobSite: { estimate: { companyId } } }, select: { name:true,jobSite: { select: { estimateId:true,estimate: { select: { status: true, signedAt: true } } } } } });
  if (!item) throw new Error("Estimate item not found.");
  if (isEstimateLocked(item.jobSite.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.$transaction(async tx=>{const updated=await tx.estimateItem.update({
    where: { id },
    data: { ...data, ...(input.priceOverride !== undefined ? { pricingManuallyEdited: true } : {}) },
  });await recordEstimateEventInTransaction(tx,{companyId,estimateId:item.jobSite.estimateId,eventType:"Items Changed",category:"Items",actor:{type:"Employee",displayName:"Team member"},summary:`Team member updated ${item.name}`,visibility:"Internal",metadata:{action:"updated",itemId:id,fields:Object.keys(data)}});return updated});
}
