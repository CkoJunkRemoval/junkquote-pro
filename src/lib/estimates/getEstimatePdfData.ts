import { prisma } from "../prisma";
import type { PublicEstimateApproval } from "./getPublicEstimateByApprovalToken";

export async function getEstimatePdfData(companyId: string, estimateId: string): Promise<PublicEstimateApproval> {
  const estimate = await prisma.estimate.findFirst({
    where: { id: estimateId, companyId },
    include: { company: true, customer: true, property: true, jobSites: { orderBy: { sortOrder: "asc" }, include: { items: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!estimate) throw new Error("Estimate not found.");

  return {
    company: { name: estimate.company.displayName || estimate.company.name, phone: estimate.company.phone, email: estimate.company.email, website: estimate.company.website, logoUrl: estimate.company.logoUrl, primaryColor: estimate.company.primaryColor, secondaryColor: estimate.company.secondaryColor },
    customerName: `${estimate.customer.firstName} ${estimate.customer.lastName}`.trim(),
    propertyAddress: { address: estimate.property.address, city: estimate.property.city, state: estimate.property.state, zip: estimate.property.zip },
    jobSites: estimate.jobSites.map((site) => ({ name: site.name, customerNotes: site.customerNotes, items: site.items.map((item) => ({ name: item.name, category: item.category, quantity: item.quantity, notes: item.notes })) })),
    pricing: { subtotal: estimate.pricingSubtotal, labor: estimate.pricingLabor, disposal: estimate.pricingDisposal, discount: estimate.pricingDiscount, total: estimate.pricingTotal },
    status: estimate.status,
    approvalTokenExpiresAt: estimate.approvalTokenExpiresAt ?? new Date(0),
    signature: estimate.status === "Approved" && estimate.signatureData && estimate.signerName && estimate.signedAt && estimate.signatureMethod
      ? { signerName: estimate.signerName, signedAt: estimate.signedAt, method: estimate.signatureMethod, data: estimate.signatureData }
      : undefined,
  };
}
