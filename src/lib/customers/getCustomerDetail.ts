import { prisma } from "../prisma";

export async function getCustomerDetail(companyId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, companyId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      portalAccesses: { orderBy: { updatedAt: "desc" }, take: 1, select: { id: true, email: true, status: true, lastLoginAt: true, createdAt: true } },
      properties: {
        orderBy: { address: "asc" },
        select: {
          id: true,
          address: true,
          city: true,
          state: true,
          zip: true,
          gateCode: true,
          accessNotes: true,
          createdAt: true,
        },
      },
      estimates: {
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          status: true,
          pricingTotal: true,
          updatedAt: true,
          property: { select: { address: true, city: true, state: true, zip: true } },
        },
      },
      jobs: { orderBy: { createdAt: "desc" }, select: { id: true, jobNumber: true, status: true, scheduledStart: true, property: { select: { address: true } } } },
      invoices: { orderBy: { createdAt: "desc" }, select: { id: true, displayNumber: true, status: true, total: true, balanceDue: true, dueDate: true, payments: { orderBy: { paymentDate: "desc" }, select: { id: true, amount: true, method: true, paymentDate: true } } } },
      servicePlans: { orderBy: { updatedAt: "desc" }, select: { id: true, name: true, status: true, nextRunAt: true, jobs: { orderBy: { servicePlanOccurrence: "desc" }, take: 3, select: { id: true, status: true, servicePlanOccurrence: true } } } },
    },
  });
}
