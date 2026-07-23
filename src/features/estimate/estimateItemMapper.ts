import type { EstimateItem } from "./types";

export interface PersistedEstimateItem {
  id: string;
  itemId: string;
  name: string;
  category: string;
  quantity: number;
  notes: string;
  priceOverride: number | null;
  libraryItemId?: string | null;
  basePrice: number;
  disposalFee: number;
  laborHours: number;
  weightClass: string;
  estimatedVolume: number;
  crewRequirement: number;
  recyclable: boolean;
  donationEligible: boolean;
  hazardous: boolean;
  refrigerant: boolean;
  electronics: boolean;
  mattress: boolean;
  tire: boolean;
  appliance: boolean;
  constructionDebris: boolean;
  yardWaste: boolean;
  requiresDisassembly: boolean;
  requiresSpecialEquipment: boolean;
  pricingManuallyEdited: boolean;
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
    libraryItemId: item.libraryItemId ?? undefined,
    basePrice: item.basePrice,
    disposalFee: item.disposalFee,
    laborHours: item.laborHours,
    weightClass: item.weightClass,
    estimatedVolume: item.estimatedVolume,
    crewRequirement: item.crewRequirement,
    recyclable: item.recyclable,
    donationEligible: item.donationEligible,
    hazardous: item.hazardous,
    refrigerant: item.refrigerant,
    electronics: item.electronics,
    mattress: item.mattress,
    tire: item.tire,
    appliance: item.appliance,
    constructionDebris: item.constructionDebris,
    yardWaste: item.yardWaste,
    requiresDisassembly: item.requiresDisassembly,
    requiresSpecialEquipment: item.requiresSpecialEquipment,
    pricingManuallyEdited: item.pricingManuallyEdited,
  };
}
