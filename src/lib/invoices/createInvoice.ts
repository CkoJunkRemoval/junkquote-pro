import { prisma } from "../prisma";
import { syncPricingOutcomeForInvoice } from "@/lib/smartPricing/outcomes";

export interface CreateInvoiceInput { estimateId: string; jobId?: string; }

export async function createInvoice(companyId: string, input: CreateInvoiceInput) {
  const invoice = await prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findFirst({
      where: { id: input.estimateId, companyId, customer: { companyId }, property: { customer: { companyId } } },
      select: { id: true, companyId: true, customerId: true, propertyId: true, status: true, pricingSubtotal: true, pricingLabor: true, pricingDisposal: true, pricingDiscount: true, pricingTotal: true },
    });
    if (!estimate) throw new Error("Estimate not found.");

    const existing = await tx.invoice.findUnique({ where: { estimateId: estimate.id } });
    if (existing) throw new Error("An invoice already exists for this estimate.");

    let jobId: string | undefined;
    let isCompletedJob = false;
    if (input.jobId) {
      const job = await tx.job.findFirst({ where: { id: input.jobId, estimateId: estimate.id, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true, status: true } });
      if (!job) throw new Error("Job not found for this estimate.");
      jobId = job.id;
      isCompletedJob = job.status === "Completed";
    }

    if (estimate.status !== "Approved" && !isCompletedJob) {
      throw new Error("Invoices can only be generated from approved estimates or completed jobs.");
    }

    const [latestInvoice, company] = await Promise.all([
      tx.invoice.findFirst({ orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } }),
      tx.company.findUnique({ where: { id: companyId }, select: { invoicePrefix: true, defaultPaymentTermsDays: true } }),
    ]);
    if (!company) throw new Error("Company not found.");
    const invoiceNumber = (latestInvoice?.invoiceNumber ?? 0) + 1;
    const subtotal = estimate.pricingSubtotal + estimate.pricingLabor + estimate.pricingDisposal;
    const issuedDate = new Date();
    const dueDate = new Date(issuedDate);
    dueDate.setDate(dueDate.getDate() + company.defaultPaymentTermsDays);

    return tx.invoice.create({
      data: {
        companyId: estimate.companyId,
        customerId: estimate.customerId,
        propertyId: estimate.propertyId,
        estimateId: estimate.id,
        ...(jobId ? { jobId } : {}),
        invoiceNumber,
        displayNumber: `${company.invoicePrefix}-${invoiceNumber}`,
        subtotal,
        tax: 0,
        discounts: estimate.pricingDiscount,
        total: estimate.pricingTotal,
        balanceDue: estimate.pricingTotal,
        issuedDate,
        dueDate,
      },
    });
  });
  if (invoice.jobId) await syncPricingOutcomeForInvoice(companyId, invoice.id);
  return invoice;
}

export function createInvoiceFromEstimate(companyId: string, estimateId: string) { return createInvoice(companyId, { estimateId }); }
export async function createInvoiceFromJob(companyId: string, jobId: string) {
  const job = await prisma.job.findFirst({ where: { id: jobId, companyId, estimate: { companyId }, customer: { companyId } }, select: { estimateId: true } });
  if (!job) throw new Error("Job not found.");
  return createInvoice(companyId, { estimateId: job.estimateId, jobId });
}
