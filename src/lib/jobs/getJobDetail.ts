import { prisma } from "../prisma";

export async function getJobDetail(companyId: string, jobId: string) {
  return prisma.job.findFirst({
    where: { id: jobId, companyId },
    select: {
      id: true, jobNumber: true, estimateId: true, status: true, schedulingStatus: true, scheduleVersion: true, dispatchProgress: true, truck: true, scheduledStart: true, scheduledEnd: true, arrivalWindowStart: true, arrivalWindowEnd: true, estimatedDurationMinutes: true, dispatchNotes: true, internalAccessNotes: true, customerInstructions: true, allDay: true, timeZone: true, lastScheduledAt: true, crewNotes: true, customerNotes: true, completionNotes: true, actualLaborHours: true, actualLaborCost: true, actualDisposalCost: true, actualTravelCost: true, otherActualCost: true, actualCostNotes: true, finalInvoiceAmount: true, createdAt: true, updatedAt: true,
      assignments: { include: { employee: true, crew: { include: { members: { include: { employee: true } } } } } },
      vehicleAssignments: { include: { fleetAsset: true } },
      customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      property: { select: { address: true, city: true, state: true, zip: true, gateCode: true, accessNotes: true } },
      estimate: { select: { status: true, pricingSubtotal: true, pricingLabor: true, pricingDisposal: true, pricingDiscount: true, pricingTotal: true, jobSites: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, customerNotes: true, items: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, quantity: true, notes: true, priceOverride: true } } } } } },
      company: { select: { auditEvents: { where: { entityType: "Job", entityId: jobId, eventType: { in: ["JOB_SCHEDULED","JOB_RESCHEDULED","JOB_CONFIRMED","JOB_DELAYED","JOB_CANCELLED","CREW_ASSIGNED"] } }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, eventType: true, createdAt: true, metadata: true } } } },
    },
  });
}
