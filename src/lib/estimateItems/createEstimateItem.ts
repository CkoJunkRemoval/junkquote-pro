import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";
import {recordEstimateEventInTransaction} from "../estimates/estimateEvents";

export interface CreateEstimateItemInput {
  jobSiteId: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  notes?: string;
  priceOverride?: number;
  sortOrder: number;
}

export async function createEstimateItem(companyId: string, input: CreateEstimateItemInput) {
  const site = await prisma.jobSite.findFirst({ where: { id: input.jobSiteId, estimate: { companyId } }, select: { estimateId:true,estimate: { select: { status: true, signedAt: true } } } });
  if (!site) throw new Error("Job site not found.");
  if (isEstimateLocked(site.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.$transaction(async tx=>{const item=await tx.estimateItem.create({
    data: {
      jobSiteId: input.jobSiteId,
      itemId: input.itemId,
      name: input.name,
      category: input.category,
      quantity: input.quantity,
      notes: input.notes ?? "",
      priceOverride: input.priceOverride,
      sortOrder: input.sortOrder,
    },
  });await recordEstimateEventInTransaction(tx,{companyId,estimateId:site.estimateId,eventType:"Items Changed",category:"Items",actor:{type:"Employee",displayName:"Team member"},summary:`Team member added ${input.name}`,visibility:"Internal",metadata:{action:"added",itemId:item.id,name:item.name,quantity:item.quantity}});return item});
}
