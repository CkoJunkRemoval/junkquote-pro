import { prisma } from "../prisma";
import { syncPricingOutcomeForInvoice } from "@/lib/smartPricing/outcomes";

export interface CreateInvoiceInput { estimateId: string; jobId?: string; }

export async function createInvoice(companyId: string, input: CreateInvoiceInput) {
  const invoice = await prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findFirst({
      where: { id: input.estimateId, companyId, customer: { companyId }, property: { customer: { companyId } } },
      select: { id: true, companyId: true, customerId: true, propertyId: true, status: true, pricingSubtotal: true, pricingLabor: true, pricingDisposal: true, pricingDiscount: true, pricingTotal: true, jobSites: { orderBy: { sortOrder: "asc" }, select: { items: { orderBy: { sortOrder: "asc" }, select: { name: true, quantity: true, priceOverride: true } } } } },
    });
    if (!estimate) throw new Error("Estimate not found.");

    const existing = await tx.invoice.findUnique({ where: { estimateId: estimate.id } });
    if (existing) throw new Error("An invoice already exists for this estimate.");

    let jobId: string | undefined;
    let isCompletedJob = false;
    if (input.jobId) {
      const job = await tx.job.findFirst({ where: { id: input.jobId, estimateId: estimate.id, companyId, customer: { companyId }, estimate: { companyId } }, select: { id: true, status: true, finalInvoiceAmount: true } });
      if (!job) throw new Error("Job not found for this estimate.");
      jobId = job.id;
      isCompletedJob = job.status === "Completed";
      if (job.finalInvoiceAmount != null) estimate.pricingTotal = job.finalInvoiceAmount;
    }

    if (estimate.status !== "Approved" && !isCompletedJob) {
      throw new Error("Invoices can only be generated from approved estimates or completed jobs.");
    }

    const [latestInvoice, company] = await Promise.all([
      tx.invoice.findFirst({ orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } }),
      tx.company.findUnique({ where: { id: companyId }, select: { invoicePrefix: true, defaultPaymentTermsDays: true, defaultTaxRate: true } }),
    ]);
    if (!company) throw new Error("Company not found.");
    const invoiceNumber = (latestInvoice?.invoiceNumber ?? 0) + 1;
    const subtotal = isCompletedJob && estimate.pricingTotal !== (estimate.pricingSubtotal + estimate.pricingLabor + estimate.pricingDisposal - estimate.pricingDiscount) ? estimate.pricingTotal : estimate.pricingSubtotal + estimate.pricingLabor + estimate.pricingDisposal;
    const issuedDate = new Date();
    const dueDate = new Date(issuedDate);
    dueDate.setDate(dueDate.getDate() + company.defaultPaymentTermsDays);

    const serviceItems = (estimate.jobSites ?? []).flatMap((site) => site.items).map((item, index) => ({ description: item.name, kind: "Service", quantity: item.quantity, unitPrice: item.priceOverride ?? 0, amount: item.quantity * (item.priceOverride ?? 0), sortOrder: index }));
    const baseItems = [...serviceItems, ...(estimate.pricingLabor ? [{ description: "Labor", kind: "Labor", quantity: 1, unitPrice: estimate.pricingLabor, amount: estimate.pricingLabor, sortOrder: serviceItems.length }] : []), ...(estimate.pricingDisposal ? [{ description: "Disposal fees", kind: "Disposal", quantity: 1, unitPrice: estimate.pricingDisposal, amount: estimate.pricingDisposal, sortOrder: serviceItems.length + 1 }] : [])];
    const tax = Math.round((subtotal - estimate.pricingDiscount) * (company.defaultTaxRate ?? 0)) / 100;
    const calculatedTotal = subtotal - estimate.pricingDiscount + tax;
    const total = isCompletedJob && estimate.pricingTotal !== calculatedTotal ? estimate.pricingTotal : calculatedTotal;
    if (Math.abs(total - calculatedTotal) > 0.005) baseItems.push({ description: "Final job adjustment", kind: "Adjustment", quantity: 1, unitPrice: total - calculatedTotal, amount: total - calculatedTotal, sortOrder: baseItems.length });
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
        tax,
        discounts: subtotal === estimate.pricingTotal ? 0 : estimate.pricingDiscount,
        total,
        balanceDue: total,
        issuedDate,
        dueDate,
        lineItems: { create: baseItems },
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
