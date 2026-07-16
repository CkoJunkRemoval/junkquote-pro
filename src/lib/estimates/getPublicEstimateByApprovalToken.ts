import { prisma } from "../prisma";
import { getPublicApprovalError, type PublicApprovalStatus } from "./publicEstimateApproval";

export interface PublicEstimateApproval {
  company: { name: string; phone: string | null; email: string | null; website: string | null };
  customerName: string;
  propertyAddress: { address: string; city: string; state: string; zip: string };
  jobSites: Array<{
    name: string;
    customerNotes: string;
    items: Array<{ name: string; category: string; quantity: number; notes: string }>;
  }>;
  pricing: { subtotal: number; labor: number; disposal: number; discount: number; total: number };
  status: PublicApprovalStatus;
  approvalTokenExpiresAt: Date;
}

export async function getPublicEstimateByApprovalToken(token: string): Promise<PublicEstimateApproval> {
  if (!token) {
    throw new Error("This approval link is invalid or has expired.");
  }

  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      company: true,
      customer: true,
      property: true,
      jobSites: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
    },
  });
  const error = getPublicApprovalError(
    estimate?.status as PublicApprovalStatus | undefined ?? null,
    estimate?.approvalTokenExpiresAt ?? null
  );

  if (error || !estimate || !estimate.approvalTokenExpiresAt) {
    throw new Error(error ?? "This approval link is invalid or has expired.");
  }

  const status = estimate.status as PublicApprovalStatus;
  const publicStatus = status === "Ready" ? "Sent" : status;

  if (status === "Ready") {
    await prisma.estimate.update({
      where: { id: estimate.id },
      data: { status: "Sent" },
    });
  }

  return {
    company: {
      name: estimate.company.name,
      phone: estimate.company.phone,
      email: estimate.company.email,
      website: estimate.company.website,
    },
    customerName: `${estimate.customer.firstName} ${estimate.customer.lastName}`.trim(),
    propertyAddress: {
      address: estimate.property.address,
      city: estimate.property.city,
      state: estimate.property.state,
      zip: estimate.property.zip,
    },
    jobSites: estimate.jobSites.map((jobSite) => ({
      name: jobSite.name,
      customerNotes: jobSite.customerNotes,
      items: jobSite.items.map((item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        notes: item.notes,
      })),
    })),
    pricing: {
      subtotal: estimate.pricingSubtotal,
      labor: estimate.pricingLabor,
      disposal: estimate.pricingDisposal,
      discount: estimate.pricingDiscount,
      total: estimate.pricingTotal,
    },
    status: publicStatus,
    approvalTokenExpiresAt: estimate.approvalTokenExpiresAt,
  };
}
