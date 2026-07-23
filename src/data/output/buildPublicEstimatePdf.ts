import type { PublicEstimateApproval } from "@/lib/estimates/getPublicEstimateByApprovalToken";
import type { EstimatePdf } from "./buildEstimatePdf";

export function buildPublicEstimatePdf(estimate: PublicEstimateApproval): EstimatePdf {
  const pricingSections=estimate.breakdown?.sections??[
    {title:"Applied Charges",lines:[{label:"Estimate charges",amount:estimate.pricing.subtotal+estimate.pricing.labor+estimate.pricing.disposal}]},
    ...(estimate.pricing.discount?[{title:"Discounts",lines:[{label:"Discount",amount:-estimate.pricing.discount}]}]:[]),
  ];
  return {
    title: estimate.company.name,
    estimateNumber: "Customer Estimate",
    createdDate: new Date().toLocaleString(),
    sections: [
      { title: "Customer", rows: [{ label: "Name", value: estimate.customerName }, { label: "Property", value: `${estimate.propertyAddress.address}, ${estimate.propertyAddress.city}, ${estimate.propertyAddress.state} ${estimate.propertyAddress.zip}` }, { label: "Status", value: estimate.status }] },
      ...estimate.jobSites.map((site) => ({ title: `Job Site: ${site.name}`, rows: [...(site.customerNotes ? [{ label: "Notes", value: site.customerNotes }] : []), ...site.items.map((item) => ({ label: item.name, value: `Quantity: ${item.quantity}${item.notes ? ` — ${item.notes}` : ""}` }))] })),
      ...pricingSections.map(section=>({title:section.title,rows:section.lines.map(row=>({label:`${"quantity" in row&&row.quantity&&row.quantity!==1?`${row.quantity} x `:""}${row.label}`,value:`${row.amount<0?"-":""}$${Math.abs(row.amount).toFixed(2)}`}))})),
    ],
    total: `$${estimate.pricing.total.toFixed(2)}`,
    status: estimate.status,
    branding: estimate.company,
    signature: estimate.signature ? { signerName: estimate.signature.signerName, signedAt: estimate.signature.signedAt.toLocaleString(), method: estimate.signature.method, image: estimate.signature.data } : undefined,
  };
}
