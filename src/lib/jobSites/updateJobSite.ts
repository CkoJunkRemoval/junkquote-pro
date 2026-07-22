import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";
import {recordEstimateEventInTransaction} from "../estimates/estimateEvents";

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
  const site = await prisma.jobSite.findFirst({ where: { id, estimate: { companyId } }, select: { name:true,estimateId:true,estimate: { select: { status: true, signedAt: true } } } });
  if (!site) throw new Error("Job site not found.");
  if (isEstimateLocked(site.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  return prisma.$transaction(async tx=>{const updated=await tx.jobSite.update({
    where: { id },
    data,
  });const notesChanged=data.customerNotes!==undefined||data.crewNotes!==undefined||data.internalNotes!==undefined;await recordEstimateEventInTransaction(tx,{companyId,estimateId:site.estimateId,eventType:notesChanged?"Notes Updated":"Estimate Updated",category:notesChanged?"Notes":"Estimate",actor:{type:"Employee",displayName:"Team member"},summary:`Team member updated ${site.name}`,visibility:"Internal",metadata:{jobSiteId:id,fields:Object.keys(data)}});return updated});
}
