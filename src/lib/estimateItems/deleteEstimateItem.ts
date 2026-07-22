import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";
import {recordEstimateEventInTransaction} from "../estimates/estimateEvents";

export async function deleteEstimateItem(companyId: string, id: string) {
  const item = await prisma.estimateItem.findFirst({ where: { id, jobSite: { estimate: { companyId } } }, select: { name:true,jobSite: { select: { estimateId:true,estimate: { select: { status: true, signedAt: true } } } } } });
  if (!item) throw new Error("Estimate item not found.");
  if (isEstimateLocked(item.jobSite.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.$transaction(async tx=>{const deleted=await tx.estimateItem.delete({
    where: { id },
  });await recordEstimateEventInTransaction(tx,{companyId,estimateId:item.jobSite.estimateId,eventType:"Items Changed",category:"Items",actor:{type:"Employee",displayName:"Team member"},summary:`Team member removed ${item.name}`,visibility:"Internal",metadata:{action:"removed",itemId:id,name:item.name}});return deleted});
}
