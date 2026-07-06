import { Estimate } from "@/features/estimate/types";

import { calculateEstimate } from "@/data/pricing/calculateEstimate";
import { calculateTruckFill } from "@/data/pricing/calculateTruckFill";
import { buildEstimateBreakdown } from "@/data/pricing/buildEstimateBreakdown";

export interface EstimatePackage {
  estimateNumber: string;

  createdDate: string;

  customer: Estimate["customer"];

  property: Estimate["property"];

  jobSites: Estimate["jobSites"];

  breakdown: ReturnType<
    typeof buildEstimateBreakdown
  >;

  pricing: ReturnType<
    typeof calculateEstimate
  >;

  truckFill: ReturnType<
    typeof calculateTruckFill
  >;
}

export function buildEstimatePackage(
  estimate: Estimate
): EstimatePackage {
  const pricing =
    calculateEstimate(estimate);

  const truckFill =
    calculateTruckFill(
      pricing.truckVolume
    );

  const breakdown =
    buildEstimateBreakdown(
      estimate
    );

  const estimateNumber =
    `CKO-${
      new Date().getFullYear()
    }-${Math.floor(
      Math.random() * 90000 + 10000
    )}`;

  return {
    estimateNumber,

    createdDate:
      new Date().toLocaleString(),

    customer: estimate.customer,

    property: estimate.property,

    jobSites: estimate.jobSites,

    breakdown,

    pricing,

    truckFill,
  };
}