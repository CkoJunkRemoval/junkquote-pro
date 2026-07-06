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
  };
}