import "server-only";
import { prisma } from "@/lib/prisma";
export async function getPortalDashboard(
  companyId: string,
  customerId: string,
) {
  const now = new Date();
  const [estimates, jobs, invoices, payments, plans] = await Promise.all([
    prisma.estimate.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ["Sent", "Approved", "Scheduled"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
      select: {
        id: true,
        displayNumber: true,
        status: true,
        pricingTotal: true,
        updatedAt: true,
      },
    }),
    prisma.job.findMany({
      where: {
        companyId,
        customerId,
        status: { in: ["Scheduled", "InProgress"] },
        scheduledStart: { gte: now },
      },
      orderBy: { scheduledStart: "asc" },
      take: 10,
      select: {
        id: true,
        status: true,
        scheduledStart: true,
        scheduledEnd: true,
        property: { select: { address: true } },
        servicePlanId: true,
      },
    }),
    prisma.invoice.findMany({
      where: {
        companyId,
        customerId,
        balanceDue: { gt: 0 },
        status: { not: "Cancelled" },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
      select: {
        id: true,
        displayNumber: true,
        status: true,
        total: true,
        balanceDue: true,
        dueDate: true,
      },
    }),
    prisma.payment.findMany({
      where: { companyId, invoice: { companyId, customerId } },
      orderBy: { paymentDate: "desc" },
      take: 10,
      select: {
        id: true,
        amount: true,
        method: true,
        paymentDate: true,
        invoice: { select: { id: true, displayNumber: true } },
        refunds: { select: { amount: true } },
      },
    }),
    prisma.servicePlan.findMany({
      where: { companyId, customerId, status: { in: ["Active", "Paused"] } },
      orderBy: { nextRunAt: "asc" },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        nextRunAt: true,
        recurrenceType: true,
        interval: true,
      },
    }),
  ]);
  return {
    estimates,
    jobs,
    invoices,
    payments,
    plans,
    outstandingActions: [
      ...estimates
        .filter((x) => x.status === "Sent")
        .map((x) => ({
          type: "estimate",
          label: `Estimate ${x.displayNumber ?? ""} awaits approval`,
          href: `/portal/estimates/${x.id}`,
        })),
      ...invoices.map((x) => ({
        type: "invoice",
        label: `${x.displayNumber ?? "Invoice"} has ${money(x.balanceDue)} due`,
        href: `/portal/invoices/${x.id}`,
      })),
      ...jobs
        .slice(0, 3)
        .map((x) => ({
          type: "job",
          label: `Appointment ${x.scheduledStart?.toLocaleDateString()}`,
          href: `/portal/jobs/${x.id}`,
        })),
    ],
  };
}
export async function listPortalEstimates(
  companyId: string,
  customerId: string,
) {
  return prisma.estimate.findMany({
    where: { companyId, customerId },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      displayNumber: true,
      status: true,
      pricingSubtotal: true,
      pricingLabor: true,
      pricingDisposal: true,
      pricingDiscount: true,
      pricingTotal: true,
      updatedAt: true,
      approvalToken: true,
      approvalTokenExpiresAt: true,
      signerName: true,
      signedAt: true,
      property: { select: { address: true } },
      jobSites: {
        orderBy: { sortOrder: "asc" },
        select: {
          id: true,
          name: true,
          items: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              quantity: true,
              priceOverride: true,
            },
          },
        },
      },
    },
  });
}
export async function getPortalEstimate(
  companyId: string,
  customerId: string,
  id: string,
) {
  return prisma.estimate.findFirst({
    where: { id, companyId, customerId },
    include: {
      property: true,
      jobSites: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
}
export async function listPortalJobs(
  companyId: string,
  customerId: string,
  showCrew = false,
) {
  return prisma.job.findMany({
    where: { companyId, customerId },
    orderBy: { scheduledStart: "desc" },
    select: {
      id: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      customerNotes: true,
      servicePlan: { select: { name: true } },
      property: {
        select: { address: true, city: true, state: true, zip: true },
      },
      photos: {
        where: { customerVisible: true },
        select: { id: true, category: true, caption: true, fileUrl: true },
      },
      ...(showCrew
        ? {
            assignments: {
              where: { crewId: { not: null } },
              select: { crew: { select: { name: true } } },
            },
          }
        : {}),
    },
  });
}
export async function getPortalJob(
  companyId: string,
  customerId: string,
  id: string,
  showCrew = false,
) {
  return prisma.job.findFirst({
    where: { id, companyId, customerId },
    select: {
      id: true,
      companyId: true,
      customerId: true,
      status: true,
      scheduledStart: true,
      scheduledEnd: true,
      customerNotes: true,
      servicePlan: { select: { name: true } },
      property: {
        select: { address: true, city: true, state: true, zip: true },
      },
      photos: {
        where: { customerVisible: true },
        select: { id: true, category: true, caption: true, fileUrl: true },
      },
      ...(showCrew
        ? {
            assignments: {
              where: { crewId: { not: null } },
              select: { crew: { select: { name: true } } },
            },
          }
        : {}),
    },
  });
}
export async function listPortalInvoices(
  companyId: string,
  customerId: string,
) {
  return prisma.invoice.findMany({
    where: { companyId, customerId },
    orderBy: { createdAt: "desc" },
    include: {
      property: true,
      payments: {
        orderBy: { paymentDate: "desc" },
        include: { refunds: true },
      },
    },
  });
}
export async function getPortalInvoice(
  companyId: string,
  customerId: string,
  id: string,
) {
  return prisma.invoice.findFirst({
    where: { id, companyId, customerId },
    include: {
      property: true,
      payments: {
        orderBy: { paymentDate: "desc" },
        include: { refunds: true },
      },
    },
  });
}
export async function listPortalPayments(
  companyId: string,
  customerId: string,
) {
  return prisma.payment.findMany({
    where: { companyId, invoice: { companyId, customerId } },
    orderBy: { paymentDate: "desc" },
    include: {
      refunds: true,
      invoice: { select: { id: true, displayNumber: true } },
    },
  });
}
export async function listPortalServicePlans(
  companyId: string,
  customerId: string,
) {
  return prisma.servicePlan.findMany({
    where: { companyId, customerId, status: { in: ["Active", "Paused"] } },
    orderBy: { nextRunAt: "asc" },
    include: {
      property: true,
      jobs: {
        orderBy: { servicePlanOccurrence: "desc" },
        take: 3,
        select: { id: true, status: true, servicePlanOccurrence: true },
      },
    },
  });
}
const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value,
  );
