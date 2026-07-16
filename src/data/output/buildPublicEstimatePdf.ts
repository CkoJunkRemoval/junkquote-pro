import type { PublicEstimateApproval } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import type { EstimatePdf } from "./buildEstimatePdf";

export function buildPublicEstimatePdf(estimate: PublicEstimateApproval): EstimatePdf {
  return {
    title: estimate.company.name,
    estimateNumber: "Customer Estimate",
    createdDate: new Date().toLocaleString(),
    sections: [
      { title: "Customer", rows: [{ label: "Name", value: estimate.customerName }, { label: "Property", value: `${estimate.propertyAddress.address}, ${estimate.propertyAddress.city}, ${estimate.propertyAddress.state} ${estimate.propertyAddress.zip}` }, { label: "Status", value: estimate.status }] },
      ...estimate.jobSites.map((site) => ({ title: `Job Site: ${site.name}`, rows: [...(site.customerNotes ? [{ label: "Notes", value: site.customerNotes }] : []), ...site.items.map((item) => ({ label: item.name, value: `Quantity: ${item.quantity}${item.notes ? ` — ${item.notes}` : ""}` }))] })),
      { title: "Pricing", rows: [{ label: "Subtotal", value: `$${estimate.pricing.subtotal.toFixed(2)}` }, { label: "Labor", value: `$${estimate.pricing.labor.toFixed(2)}` }, { label: "Disposal", value: `$${estimate.pricing.disposal.toFixed(2)}` }, { label: "Discount", value: `$${estimate.pricing.discount.toFixed(2)}` }] },
    ],
    total: `$${estimate.pricing.total.toFixed(2)}`,
    status: estimate.status,
    signature: estimate.signature ? { signerName: estimate.signature.signerName, signedAt: estimate.signature.signedAt.toLocaleString(), method: estimate.signature.method, image: estimate.signature.data } : undefined,
  };
}
