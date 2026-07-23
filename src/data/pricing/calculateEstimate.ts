import { Estimate, JobSite } from "@/features/estimate/types";

import { DEFAULT_PRICING } from "./defaultPricing";
import { calculateLabor } from "./calculateLabor";

export interface EstimateTotals {
  itemCount: number;

  heavyItems: number;

  truckVolume: number;

  basePrice: number;

  disposalFees: number;

  minimumCharge: number;

  recommendedCrew: number;

  laborHours: number;

  labor: number;

  tax: number;

  subtotal: number;

  total: number;
}

export function calculateJobSiteSubtotal(jobSite: JobSite) {
  let basePrice = 0;
  let disposalFees = 0;

  jobSite.items.forEach((estimateItem) => {
    basePrice +=
      (estimateItem.priceOverride ?? estimateItem.basePrice) *
      estimateItem.quantity;

    disposalFees +=
      estimateItem.disposalFee * estimateItem.quantity;
  });

  return (
    basePrice +
    disposalFees +
    disposalFees * DEFAULT_PRICING.disposalMarkup
  );
}

export function calculateEstimate(
  estimate: Estimate
): EstimateTotals {
  let itemCount = 0;

  let heavyItems = 0;

  let truckVolume = 0;

  let basePrice = 0;

  let disposalFees = 0;
  let configuredLaborHours = 0;
  let configuredLaborUnits = 0;

  estimate.jobSites.forEach((site) => {
    site.items.forEach((estimateItem) => {
      itemCount += estimateItem.quantity;

      truckVolume +=
        estimateItem.estimatedVolume *
        estimateItem.quantity;

      basePrice +=
        (estimateItem.priceOverride ?? estimateItem.basePrice) *
        estimateItem.quantity;

      disposalFees +=
        estimateItem.disposalFee *
        estimateItem.quantity;
      configuredLaborHours += estimateItem.laborHours * estimateItem.quantity;
      configuredLaborUnits += estimateItem.laborHours * estimateItem.crewRequirement * estimateItem.quantity;

      if (
        estimateItem.weightClass === "Heavy" ||
        estimateItem.weightClass === "Extra Heavy"
      ) {
        heavyItems += estimateItem.quantity;
      }
    });
  });

  const disposalMarkup =
    disposalFees *
    DEFAULT_PRICING.disposalMarkup;

  const subtotal =
    basePrice +
    disposalFees +
    disposalMarkup +
    estimate.pricingDefaults.dumpFee +
    estimate.pricingDefaults.tripFee +
    estimate.pricingDefaults.fuelSurcharge;

  const minimumCharge = estimate.pricingDefaults.minimumCharge;

  const laborCalculation =
    calculateLabor(
      truckVolume,
      heavyItems,
      estimate.pricingDefaults.laborRate
    );

  const labor = Math.max(
    laborCalculation.laborCost,
    configuredLaborUnits * estimate.pricingDefaults.laborRate,
  );

  const calculatedTotal = Math.max(
    0,
    subtotal + labor - estimate.pricing.discount
  );

  const tax = estimate.pricingDefaults.taxEnabled
    ? calculatedTotal * (estimate.pricingDefaults.taxRate / 100)
    : 0;

  const total =
    Math.max(
      calculatedTotal + tax,
      minimumCharge
    );

  return {
    itemCount,

    heavyItems,

    truckVolume,

    basePrice,

    disposalFees,

    minimumCharge,

    recommendedCrew: Math.max(laborCalculation.recommendedCrew, estimate.pricingDefaults.defaultCrewSize, ...estimate.jobSites.flatMap((site) => site.items.map((item) => item.crewRequirement))),

    laborHours: Math.max(laborCalculation.laborHours, configuredLaborHours),

    labor,

    tax,

    subtotal,

    total,
  };
}
