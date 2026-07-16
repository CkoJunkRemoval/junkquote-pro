import type { EstimateItem } from "./types";

export interface PersistedEstimateItem {
  id: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  notes: string;
  priceOverride: number | null;
}

export function toEstimateItem(
  item: PersistedEstimateItem
): EstimateItem {
  return {
    id: item.id,
    itemId: item.itemId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    notes: item.notes,
    priceOverride: item.priceOverride ?? undefined,
  };
}
