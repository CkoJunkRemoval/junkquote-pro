import { prisma } from "../prisma";

export async function getInvoiceDetail(companyId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: {
      id: invoiceId,
      companyId,
      customer: { companyId },
      estimate: { companyId },
      OR: [{ jobId: null }, { job: { companyId } }],
    },
    select: {
      id: true,
      invoiceNumber: true,
      displayNumber: true,
      subtotal: true,
      tax: true,
      discounts: true,
      total: true,
      balanceDue: true,
      status: true,
      dueDate: true,
      issuedDate: true,
      paidDate: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      company: { select: { name: true, displayName: true, logoUrl: true, primaryColor: true, secondaryColor: true } },
      customer: { select: { firstName: true, lastName: true, phone: true, email: true } },
      property: { select: { address: true, city: true, state: true, zip: true } },
      estimate: {
        select: {
          id: true,
          status: true,
          jobSites: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              name: true,
              customerNotes: true,
              items: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, quantity: true, notes: true } },
            },
          },
        },
      },
    },
  });
}

export const getInvoicePdfData = getInvoiceDetail;
