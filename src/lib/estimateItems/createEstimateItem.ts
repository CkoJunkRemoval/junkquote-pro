import { prisma } from "../prisma";
import { ESTIMATE_LOCKED_MESSAGE, isEstimateLocked } from "../estimates/isEstimateLocked";
import {recordEstimateEventInTransaction} from "../estimates/estimateEvents";

export interface CreateEstimateItemInput {
  jobSiteId: string;
  itemLibraryId: string;
  quantity: number;
  sortOrder: number;
}

export async function createEstimateItem(companyId: string, input: CreateEstimateItemInput) {
  const site = await prisma.jobSite.findFirst({ where: { id: input.jobSiteId, estimate: { companyId } }, select: { estimateId:true,estimate: { select: { status: true, signedAt: true, pricingProfileId: true } } } });
  if (!site) throw new Error("Job site not found.");
  if (isEstimateLocked(site.estimate)) throw new Error(ESTIMATE_LOCKED_MESSAGE);
  const libraryItem = await prisma.itemLibrary.findFirst({ where: { id: input.itemLibraryId, companyId, active: true }, include: { profileOverrides: { where: { pricingProfileId: site.estimate.pricingProfileId } } } });
  if (!libraryItem) throw new Error("Item Library item not found.");
  const override = libraryItem.profileOverrides[0];
  return prisma.$transaction(async tx=>{const item=await tx.estimateItem.create({
    data: {
      jobSiteId: input.jobSiteId,
      itemId: libraryItem.id,
      libraryItemId: libraryItem.id,
      name: libraryItem.name,
      category: libraryItem.category,
      quantity: input.quantity,
      basePrice: override?.basePrice ?? libraryItem.basePrice,
      disposalFee: override?.disposalFee ?? libraryItem.disposalFee,
      laborHours: override?.laborHours ?? libraryItem.laborHours,
      weightClass: libraryItem.weightClass,
      estimatedVolume: libraryItem.estimatedVolume,
      crewRequirement: override?.crewRequirement ?? (libraryItem.requiresTwoPeople ? 2 : 1),
      recyclable: libraryItem.recyclable,
      donationEligible: libraryItem.donationEligible,
      hazardous: libraryItem.hazardous,
      refrigerant: libraryItem.refrigerant,
      electronics: libraryItem.electronics,
      mattress: libraryItem.mattress,
      tire: libraryItem.tire,
      appliance: libraryItem.appliance,
      constructionDebris: libraryItem.constructionDebris,
      yardWaste: libraryItem.yardWaste,
      requiresDisassembly: libraryItem.requiresDisassembly,
      requiresSpecialEquipment: libraryItem.requiresSpecialEquipment,
      sortOrder: input.sortOrder,
    },
  });await recordEstimateEventInTransaction(tx,{companyId,estimateId:site.estimateId,eventType:"Items Changed",category:"Items",actor:{type:"Employee",displayName:"Team member"},summary:`Team member added ${libraryItem.name}`,visibility:"Internal",metadata:{action:"added",itemId:item.id,name:item.name,quantity:item.quantity}});return item});
}
