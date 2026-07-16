import { ITEM_LIBRARY } from "@/data/items";
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
      const item = ITEM_LIBRARY.find(
        (libraryItem) =>
          libraryItem.id === estimateItem.itemId
      );

      if (!item) return;

      const unitPrice =
        (estimateItem.priceOverride ?? item.basePrice) +
        item.disposalFee;

      rows.push({
        area: site.name,
        itemName: item.name,
        quantity: estimateItem.quantity,
        unitPrice,
        totalPrice:
          unitPrice * estimateItem.quantity,
      });
    });
  });

  return rows;
}
