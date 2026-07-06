import { ITEM_LIBRARY } from "@/data/items";
import { Estimate } from "@/features/estimate/types";

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

export function calculateEstimate(
  estimate: Estimate
): EstimateTotals {
  let itemCount = 0;

  let heavyItems = 0;

  let truckVolume = 0;

  let basePrice = 0;

  let disposalFees = 0;

  estimate.jobSites.forEach((site) => {
    site.items.forEach((estimateItem) => {
      const item = ITEM_LIBRARY.find(
        (libraryItem) =>
          libraryItem.id === estimateItem.itemId
      );

      if (!item) return;

      itemCount += estimateItem.quantity;

      truckVolume +=
        item.volume *
        estimateItem.quantity;

      basePrice +=
        item.basePrice *
        estimateItem.quantity;

      disposalFees +=
        item.disposalFee *
        estimateItem.quantity;

      if (
        item.weightClass === "Heavy" ||
        item.weightClass === "Extra Heavy"
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
    disposalMarkup;

  const minimumCharge = Math.max(
    subtotal,
    DEFAULT_PRICING.minimumJob
  );

  const laborCalculation =
    calculateLabor(
      truckVolume,
      heavyItems,
      DEFAULT_PRICING.laborRate
    );

  const labor =
    laborCalculation.laborCost;

  const tax =
    (minimumCharge + labor) *
    DEFAULT_PRICING.taxRate;

  const total =
    minimumCharge +
    labor +
    tax;

  return {
    itemCount,

    heavyItems,

    truckVolume,

    basePrice,

    disposalFees,

    minimumCharge,

    recommendedCrew:
      laborCalculation.recommendedCrew,

    laborHours:
      laborCalculation.laborHours,

    labor,

    tax,

    subtotal,

    total,
  };
}