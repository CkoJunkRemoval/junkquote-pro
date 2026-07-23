import { prisma } from "../prisma";
import { isEstimateLocked } from "./isEstimateLocked";
import { recordEstimateEventInTransaction } from "./estimateEvents";

export async function createEstimateRevision(companyId: string, estimateId: string) {
  return prisma.$transaction(async (tx) => {
    const source = await tx.estimate.findFirst({
      where: { id: estimateId, companyId },
      include: {
        jobSites: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } },
        job: { include: { photos: { orderBy: { sortOrder: "asc" } } } },
        revisionPhotos: { orderBy: { sortOrder: "asc" } },
      },
    });
    if (!source) throw new Error("Estimate not found.");
    if (!isEstimateLocked(source)) throw new Error("Only an approved estimate can be revised.");

    const revisionRootId = source.revisionRootId ?? source.id;
    const root = source.revisionRootId
      ? await tx.estimate.findFirst({ where: { id: revisionRootId, companyId }, select: { displayNumber: true } })
      : source;
    if (!root) throw new Error("Original estimate not found.");

    const latest = await tx.estimate.aggregate({
      where: { OR: [{ id: revisionRootId }, { revisionRootId }] },
      _max: { revisionNumber: true },
    });
    const revisionNumber = (latest._max.revisionNumber ?? 0) + 1;
    const baseNumber = root.displayNumber ?? revisionRootId;
    const revision = await tx.estimate.create({
      data: {
        companyId,
        pricingProfileId: source.pricingProfileId,
        customerId: source.customerId,
        propertyId: source.propertyId,
        displayNumber: `${baseNumber}-R${revisionNumber}`,
        status: "Draft",
        revisionRootId,
        revisionNumber,
        pricingSubtotal: source.pricingSubtotal,
        pricingLabor: source.pricingLabor,
        pricingDisposal: source.pricingDisposal,
        pricingDiscount: source.pricingDiscount,
        pricingTotal: source.pricingTotal,
        estimatedLaborHours: source.estimatedLaborHours,
        estimatedLaborCost: source.estimatedLaborCost,
        currentStep: source.currentStep,
      },
    });

    const siteIds = new Map<string, string>();
    for (const site of source.jobSites) {
      const copy = await tx.jobSite.create({
        data: {
          estimateId: revision.id,
          name: site.name,
          status: site.status,
          customerNotes: site.customerNotes,
          crewNotes: site.crewNotes,
          internalNotes: site.internalNotes,
          sortOrder: site.sortOrder,
          items: { create: site.items.map((item) => ({
            itemId: item.itemId, libraryItemId: item.libraryItemId, name: item.name,
            category: item.category, quantity: item.quantity, notes: item.notes,
            priceOverride: item.priceOverride, basePrice: item.basePrice,
            disposalFee: item.disposalFee, laborHours: item.laborHours,
            weightClass: item.weightClass, estimatedVolume: item.estimatedVolume,
            crewRequirement: item.crewRequirement, recyclable: item.recyclable,
            donationEligible: item.donationEligible, hazardous: item.hazardous,
            refrigerant: item.refrigerant, electronics: item.electronics,
            mattress: item.mattress, tire: item.tire, appliance: item.appliance,
            constructionDebris: item.constructionDebris, yardWaste: item.yardWaste,
            requiresDisassembly: item.requiresDisassembly,
            requiresSpecialEquipment: item.requiresSpecialEquipment,
            pricingManuallyEdited: item.pricingManuallyEdited, sortOrder: item.sortOrder,
          })) },
        },
      });
      siteIds.set(site.id, copy.id);
    }

    const photos = source.revisionPhotos.length ? source.revisionPhotos : (source.job?.photos ?? []);
    if (photos.length) {
      await tx.estimatePhoto.createMany({
        data: photos.map((photo) => ({
          estimateId: revision.id,
          jobSiteId: photo.jobSiteId ? (siteIds.get(photo.jobSiteId) ?? null) : null,
          category: photo.category,
          fileUrl: photo.fileUrl,
          thumbnailUrl: photo.thumbnailUrl,
          fileName: photo.fileName,
          mimeType: photo.mimeType,
          fileSize: photo.fileSize,
          caption: photo.caption,
          customerVisible: photo.customerVisible,
          sortOrder: photo.sortOrder,
          takenAt: photo.takenAt,
        })),
      });
    }
    await recordEstimateEventInTransaction(tx,{companyId,estimateId:revision.id,eventType:"Revision Created",category:"Revision",actor:{type:"Employee",displayName:"Team member"},summary:`Team member created revision ${revisionNumber}`,visibility:"Both",metadata:{sourceEstimateId:source.id,revisionNumber}});
    return revision;
  }, { isolationLevel: "Serializable" });
}
