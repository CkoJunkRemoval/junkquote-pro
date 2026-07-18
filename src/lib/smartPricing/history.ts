import { prisma } from "@/lib/prisma";

export async function recordCompletedJobPricing(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({
    where: { id: jobId, companyId, status: "Completed" },
    include: { estimate: { include: { property: true, jobSites: { include: { items: true } } } }, invoice: { include: { payments: true } } },
  });
  if (!job) return [];
  const items = job.estimate.jobSites.flatMap((site) => site.items.map((item) => ({ site, item })));
  if (!items.length) return [];
  const totalUnits = items.reduce((sum, row) => sum + Math.max(1, row.item.quantity), 0);
  const collected = job.invoice?.payments.reduce((sum, payment) => sum + payment.amount, 0) ?? 0;
  const quoted = job.estimate.pricingTotal;
  const directCosts = job.estimate.pricingLabor + job.estimate.pricingDisposal;
  return prisma.$transaction(items.map(({ site, item }) => {
    const share = Math.max(1, item.quantity) / totalUnits;
    return prisma.pricingHistory.upsert({
      where: { jobId_item_area: { jobId: job.id, item: item.name, area: site.name } },
      create: { companyId, estimateId: job.estimateId, jobId: job.id, customerId: job.customerId, area: site.name, item: item.name,
        quantity: item.quantity, cubicYards: 0, laborHours: 0, disposalCost: job.estimate.pricingDisposal * share,
        dumpFees: job.estimate.pricingDisposal * share, finalQuotedPrice: quoted * share, finalCollectedPrice: collected * share,
        discount: job.estimate.pricingDiscount * share, profitEstimate: (collected - directCosts) * share,
        propertyType: job.estimate.property.nickname },
      update: { finalCollectedPrice: collected * share, profitEstimate: (collected - directCosts) * share },
    });
  }));
}
