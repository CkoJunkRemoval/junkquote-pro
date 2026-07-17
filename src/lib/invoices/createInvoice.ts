import { DEVELOPMENT_COMPANY_ID } from "@/lib/config";
import { prisma } from "../prisma";

export interface CreateInvoiceInput { estimateId: string; jobId?: string; }

export async function createInvoice(input: CreateInvoiceInput) {
  return prisma.$transaction(async (tx) => {
    const estimate = await tx.estimate.findFirst({
      where: { id: input.estimateId, companyId: DEVELOPMENT_COMPANY_ID },
      select: { id: true, companyId: true, customerId: true, propertyId: true, status: true, pricingSubtotal: true, pricingLabor: true, pricingDisposal: true, pricingDiscount: true, pricingTotal: true },
    });
    if (!estimate) throw new Error("Estimate not found.");

    const existing = await tx.invoice.findUnique({ where: { estimateId: estimate.id } });
    if (existing) throw new Error("An invoice already exists for this estimate.");

    let jobId: string | undefined;
    let isCompletedJob = false;
    if (input.jobId) {
      const job = await tx.job.findFirst({ where: { id: input.jobId, estimateId: estimate.id, companyId: DEVELOPMENT_COMPANY_ID }, select: { id: true, status: true } });
      if (!job) throw new Error("Job not found for this estimate.");
      jobId = job.id;
      isCompletedJob = job.status === "Completed";
    }

    if (estimate.status !== "Approved" && !isCompletedJob) {
      throw new Error("Invoices can only be generated from approved estimates or completed jobs.");
    }

    const [latestInvoice, company] = await Promise.all([
      tx.invoice.findFirst({ orderBy: { invoiceNumber: "desc" }, select: { invoiceNumber: true } }),
      tx.company.findFirst({ where: { id: DEVELOPMENT_COMPANY_ID }, select: { invoicePrefix: true, defaultPaymentTermsDays: true } }),
    ]);
    if (!company) throw new Error("Development company not found.");
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
}
