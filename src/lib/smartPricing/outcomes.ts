import { prisma } from "@/lib/prisma";
import { calculatePricingOutcome } from "./outcomeCalculator";

export async function syncPricingOutcomeForJob(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, companyId, status: "Completed", estimate: { companyId }, customer: { companyId }, property: { customer: { companyId } } }, include: { property: true, estimate: true, invoice: { include: { payments: true, refunds: true } } } });
  if (!job) throw new Error("Completed job not found.");
  if (job.invoice && job.invoice.companyId !== companyId) throw new Error("Cross-company invoice link rejected.");
  const collectedAmount = job.invoice?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const refundAmount = job.invoice?.refunds.reduce((sum, refund) => sum + refund.amount, 0) ?? 0;
  const input = { quotedAmount: job.estimate.pricingTotal, invoicedAmount: job.invoice?.total ?? null, collectedAmount, refundAmount,
    discountAmount: job.invoice?.discounts ?? job.estimate.pricingDiscount, laborHoursEstimated: job.estimate.estimatedLaborHours, laborHoursActual: job.actualLaborHours,
    laborCostEstimated: job.estimate.estimatedLaborCost, laborCostActual: job.actualLaborCost, disposalCostEstimated: job.estimate.pricingDisposal,
    disposalCostActual: job.actualDisposalCost, travelCostEstimated: null, travelCostActual: job.actualTravelCost, otherCostActual: job.otherActualCost };
  const result = calculatePricingOutcome(input); const now = new Date();
  return prisma.pricingOutcome.upsert({ where: { jobId: job.id }, create: { companyId, estimateId: job.estimateId, jobId: job.id, invoiceId: job.invoice?.id,
    customerId: job.customerId, ...input, collectedAmount: result.netCollected, grossProfit: result.grossProfit, grossMarginPercent: result.grossMarginPercent,
    estimateVarianceAmount: result.estimateVarianceAmount, estimateVariancePercent: result.estimateVariancePercent, completenessScore: result.completenessScore,
    missingData: result.missingData, classification: result.classification, collectionStatus: result.collectionStatus, propertyType: job.property.propertyType, completedAt: job.updatedAt, calculatedAt: now },
    update: { invoiceId: job.invoice?.id, ...input, collectedAmount: result.netCollected, grossProfit: result.grossProfit, grossMarginPercent: result.grossMarginPercent,
      estimateVarianceAmount: result.estimateVarianceAmount, estimateVariancePercent: result.estimateVariancePercent, completenessScore: result.completenessScore,
      missingData: result.missingData, classification: result.classification, collectionStatus: result.collectionStatus, propertyType: job.property.propertyType, calculatedAt: now } });
}
export async function syncPricingOutcomeForInvoice(companyId: string, invoiceId: string) { const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, companyId }, select: { job: { select: { id: true, status: true } } } }); if (!invoice?.job || invoice.job.status !== "Completed") return null; return syncPricingOutcomeForJob(companyId, invoice.job.id); }
export async function rebuildPricingOutcomes(companyId: string, options: { from?: Date; to?: Date; limit?: number } = {}) { const jobs = await prisma.job.findMany({ where: { companyId, status: "Completed", updatedAt: { gte: options.from, lte: options.to } }, select: { id: true }, take: options.limit ?? 1000 }); const outcomes = []; for (const job of jobs) outcomes.push(await syncPricingOutcomeForJob(companyId, job.id)); return { processed: outcomes.length, complete: outcomes.filter((row) => row.completenessScore === 100).length, incomplete: outcomes.filter((row) => row.completenessScore < 100).map((row) => ({ jobId: row.jobId, missingData: row.missingData })), outcomes }; }
