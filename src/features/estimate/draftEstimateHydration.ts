import { calculateEstimate, calculateJobSiteSubtotal } from "@/data/pricing/calculateEstimate";

import { EstimateStatus } from "./status";
import type { Estimate, JobSite } from "./types";
import { toEstimateItem, type PersistedEstimateItem } from "./estimateItemMapper";

export interface PersistedDraftEstimate {
  id: string;
  customerId: string;
  propertyId: string;
  currentStep: number;
  pricingDiscount: number;
  appliedPricingRules?: Estimate["pricingRules"];
  pricingProfileId: string;
  pricingProfile: {
    name: string;
    minimumCharge: number;
    tripFee: number;
    laborRate: number;
    dumpFee: number;
    mileageRate: number;
    fuelSurcharge: number;
    defaultCrewSize: number;
    taxEnabled: boolean;
    taxRate: number;
    currency: string;
  };
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
    items: PersistedEstimateItem[];
  }>;
}

export function hydrateDraftEstimate(savedEstimate: PersistedDraftEstimate) {
  const jobSites: JobSite[] = savedEstimate.jobSites.map((jobSite) => {
    const items = jobSite.items.map(toEstimateItem);
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
    pricingProfileId: savedEstimate.pricingProfileId,
    pricingProfileName: savedEstimate.pricingProfile.name,
    pricingDefaults: {
      minimumCharge: savedEstimate.pricingProfile.minimumCharge,
      tripFee: savedEstimate.pricingProfile.tripFee,
      laborRate: savedEstimate.pricingProfile.laborRate,
      dumpFee: savedEstimate.pricingProfile.dumpFee,
      mileageRate: savedEstimate.pricingProfile.mileageRate,
      fuelSurcharge: savedEstimate.pricingProfile.fuelSurcharge,
      defaultCrewSize: savedEstimate.pricingProfile.defaultCrewSize,
      taxEnabled: savedEstimate.pricingProfile.taxEnabled,
      taxRate: savedEstimate.pricingProfile.taxRate,
      currency: savedEstimate.pricingProfile.currency,
    },
    pricingManuallyEdited: false,
    pricingRules: savedEstimate.appliedPricingRules ?? [],
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
