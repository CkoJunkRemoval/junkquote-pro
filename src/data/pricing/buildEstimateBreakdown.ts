import { Estimate } from "@/features/estimate/types";

export interface BreakdownItem {
  area: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export function buildEstimateBreakdown(
  estimate: Estimate
): BreakdownItem[] {
  const rows: BreakdownItem[] = [];

  estimate.jobSites.forEach((site) => {
    site.items.forEach((estimateItem) => {
      const unitPrice =
        (estimateItem.priceOverride ?? estimateItem.basePrice) +
        estimateItem.disposalFee;

      rows.push({
        area: site.name,
        itemName: estimateItem.name,
        quantity: estimateItem.quantity,
        unitPrice,
        totalPrice:
          unitPrice * estimateItem.quantity,
      });
    });
  });

  return rows;
}
