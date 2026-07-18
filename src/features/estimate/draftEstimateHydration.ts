import { calculateEstimate, calculateJobSiteSubtotal } from "@/data/pricing/calculateEstimate";

import { EstimateStatus } from "./status";
import type { Estimate, JobSite } from "./types";

export interface PersistedDraftEstimate {
  id: string;
  customerId: string;
  propertyId: string;
  currentStep: number;
  pricingDiscount: number;
  status: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string | null;
  };
  property: {
    id: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    gateCode: string | null;
    accessNotes: string | null;
    propertyType?: string | null;
  };
  jobSites: Array<{
    id: string;
    name: string;
    status: string;
    customerNotes: string;
    crewNotes: string;
    internalNotes: string;
    items: Array<{
      id: string;
      itemId: string;
      name: string;
      category: string;
      quantity: number;
      notes: string;
      priceOverride: number | null;
    }>;
  }>;
}

export function hydrateDraftEstimate(savedEstimate: PersistedDraftEstimate) {
  const jobSites: JobSite[] = savedEstimate.jobSites.map((jobSite) => {
    const items = jobSite.items.map((item) => ({
      id: item.id,
      itemId: item.itemId,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      notes: item.notes,
      priceOverride: item.priceOverride ?? undefined,
    }));
    const restoredJobSite = {
      id: jobSite.id,
      name: jobSite.name,
      status: jobSite.status as JobSite["status"],
      customerNotes: jobSite.customerNotes,
      crewNotes: jobSite.crewNotes,
      internalNotes: jobSite.internalNotes,
      photos: [],
      items,
      subtotal: 0,
    };

    return {
      ...restoredJobSite,
      subtotal: calculateJobSiteSubtotal(restoredJobSite),
    };
  });

  const estimate: Estimate = {
    customerType: "existing",
    customer: {
      id: savedEstimate.customer.id,
      firstName: savedEstimate.customer.firstName,
      lastName: savedEstimate.customer.lastName,
      phone: savedEstimate.customer.phone,
      email: savedEstimate.customer.email ?? "",
    },
    property: {
      id: savedEstimate.property.id,
      type: (savedEstimate.property.propertyType ?? "") as Estimate["property"]["type"],
      address: savedEstimate.property.address,
      city: savedEstimate.property.city,
      state: savedEstimate.property.state,
      zip: savedEstimate.property.zip,
      gateCode: savedEstimate.property.gateCode ?? "",
      notes: savedEstimate.property.accessNotes ?? "",
    },
    jobSites,
    pricing: {
      subtotal: 0,
      labor: 0,
      disposal: 0,
      discount: savedEstimate.pricingDiscount,
      total: 0,
    },
    status: savedEstimate.status as EstimateStatus,
    timeline: [],
  };
  const totals = calculateEstimate(estimate);

  return {
    estimate: {
      ...estimate,
      pricing: {
        subtotal: totals.subtotal,
        labor: totals.labor,
        disposal: totals.disposalFees,
        discount: savedEstimate.pricingDiscount,
        total: totals.total,
      },
    },
    wizardStep:
      savedEstimate.currentStep > 1
        ? savedEstimate.currentStep
        : jobSites.length > 0
          ? 4
          : 3,
  };
}
