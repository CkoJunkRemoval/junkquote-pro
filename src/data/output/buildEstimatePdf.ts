import { EstimatePackage } from "./buildEstimatePackage";

export interface PdfSection {
  title: string;
  rows: {
    label: string;
    value: string;
  }[];
}

export interface EstimatePdf {
  title: string;

  estimateNumber: string;

  createdDate: string;

  sections: PdfSection[];

  total: string;
  status?: string;
  signature?: { signerName: string; signedAt: string; method: string; image: string };
}

export function buildEstimatePdf(
  estimate: EstimatePackage
): EstimatePdf {
  return {
    title: "CKO Junk Removal Estimate",

    estimateNumber: estimate.estimateNumber,

    createdDate: estimate.createdDate,

    sections: [
      {
        title: "Customer",

        rows: [
          {
            label: "Name",
            value:
              `${estimate.customer.firstName} ${estimate.customer.lastName}`,
          },

          {
            label: "Phone",
            value: estimate.customer.phone,
          },

          {
            label: "Email",
            value: estimate.customer.email,
          },
        ],
      },
      ...estimate.jobSites.map((jobSite) => ({
        title: `Job Site: ${jobSite.name}`,
        rows: [
          ...(jobSite.customerNotes ? [{ label: "Notes", value: jobSite.customerNotes }] : []),
          ...jobSite.items.map((item) => ({ label: item.name, value: `Quantity: ${item.quantity}${item.notes ? ` — ${item.notes}` : ""}` })),
        ],
      })),
      {
        title: "Pricing",
        rows: [
          { label: "Subtotal", value: `$${estimate.pricing.subtotal.toFixed(2)}` },
          { label: "Labor", value: `$${estimate.pricing.labor.toFixed(2)}` },
          { label: "Disposal", value: `$${estimate.pricing.disposalFees.toFixed(2)}` },
          { label: "Discount", value: `$${estimate.pricing.discount.toFixed(2)}` },
        ],
      },

      {
        title: "Property",

        rows: [
          {
            label: "Address",
            value: estimate.property.address,
          },

          {
            label: "City",
            value: estimate.property.city,
          },

          {
            label: "State",
            value: estimate.property.state,
          },

          {
            label: "ZIP",
            value: estimate.property.zip,
          },
        ],
      },

      {
        title: "Estimate",

        rows: [
          {
            label: "Truck Fill",
            value:
              `${estimate.truckFill.percentage}% (${estimate.truckFill.label})`,
          },

          {
            label: "Crew",
            value:
              `${estimate.pricing.recommendedCrew} Person`,
          },

          {
            label: "Labor Hours",
            value:
              estimate.pricing.laborHours.toString(),
          },

          {
            label: "Items",
            value:
              estimate.pricing.itemCount.toString(),
          },
        ],
      },
    ],

    total:
      `$${estimate.pricing.total.toFixed(2)}`,
    status: estimate.status,
  };
}
