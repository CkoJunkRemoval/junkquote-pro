import { prisma } from "../prisma";
import { getPublicApprovalError, type PublicApprovalStatus } from "./publicEstimateApproval";
import { transitionEstimate } from "./estimateLifecycle";
import { buildPersistedCustomerPricingBreakdown, type CustomerPricingBreakdown } from "@/data/pricing/livePricingBreakdown";

export interface PublicEstimateApproval {
  company: { name: string; phone: string | null; email: string | null; website: string | null; logoUrl: string | null; primaryColor: string | null; secondaryColor: string | null };
  customerName: string;
  propertyAddress: { address: string; city: string; state: string; zip: string };
  jobSites: Array<{
    name: string;
    customerNotes: string;
    items: Array<{ name: string; category: string; quantity: number; notes: string }>;
  }>;
  pricing: { subtotal: number; labor: number; disposal: number; discount: number; total: number };
  breakdown: CustomerPricingBreakdown;
  status: PublicApprovalStatus;
  approvalTokenExpiresAt: Date;
  signature?: { signerName: string; signedAt: Date; method: string; data: string };
}

export async function getPublicEstimateByApprovalToken(token: string): Promise<PublicEstimateApproval> {
  if (!token) {
    throw new Error("This approval link is invalid or has expired.");
  }

  const estimate = await prisma.estimate.findUnique({
    where: { approvalToken: token },
    include: {
      company: true,
      pricingProfile: true,
      customer: true,
      property: true,
      jobSites: {
        orderBy: { sortOrder: "asc" },
        include: { items: { orderBy: { sortOrder: "asc" } } },
      },
      appliedPricingRules: { orderBy: { displayOrder: "asc" } },
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
  const publicStatus = status === "Sent" ? "Viewed" : status;
  if (status === "Sent") await transitionEstimate(estimate.companyId,estimate.id,"Viewed",{actor:{label:"Customer"}});

  return {
    company: {
      name: estimate.company.displayName || estimate.company.name,
      phone: estimate.company.phone,
      email: estimate.company.email,
      website: estimate.company.website,
      logoUrl: estimate.company.logoUrl,
      primaryColor: estimate.company.primaryColor,
      secondaryColor: estimate.company.secondaryColor,
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
    breakdown: buildPersistedCustomerPricingBreakdown({
      items: estimate.jobSites.flatMap(site=>site.items),
      rules: estimate.appliedPricingRules,
      pricing: {subtotal:estimate.pricingSubtotal,labor:estimate.pricingLabor,disposal:estimate.pricingDisposal,discount:estimate.pricingDiscount,total:estimate.pricingTotal},
      tax:{enabled:estimate.pricingProfile.taxEnabled,rate:estimate.pricingProfile.taxRate},
    }),
    status: publicStatus,
    approvalTokenExpiresAt: estimate.approvalTokenExpiresAt,
    signature: estimate.signatureData && estimate.signerName && estimate.signedAt && estimate.signatureMethod
      ? { signerName: estimate.signerName, signedAt: estimate.signedAt, method: estimate.signatureMethod, data: estimate.signatureData }
      : undefined,
  };
}
