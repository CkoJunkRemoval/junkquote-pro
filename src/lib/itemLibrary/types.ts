export const STANDARD_ITEM_CATEGORIES = [
  "Appliances", "Furniture", "Bedroom", "Electronics", "Construction", "Yard Waste",
  "Household", "Office", "Garage", "Outdoor", "Hot Tub", "Sheds",
  "Concrete", "Dirt", "Roofing", "Miscellaneous",
] as const;

export const WEIGHT_CLASSES = ["Light", "Medium", "Heavy", "Extra Heavy"] as const;
export type WeightClass = (typeof WEIGHT_CLASSES)[number];

export type ItemLibraryInput = {
  category: string;
  name: string;
  description?: string | null;
  active?: boolean;
  displayOrder: number;
  basePrice: number;
  disposalFee: number;
  laborHours: number;
  weightClass: WeightClass;
  estimatedVolume: number;
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
  requiresTwoPeople: boolean;
  requiresDisassembly: boolean;
  requiresSpecialEquipment: boolean;
  estimateRequired?: boolean;
  notes?: string | null;
};

export type ItemOverrideInput = {
  basePrice?: number | null;
  disposalFee?: number | null;
  laborHours?: number | null;
  crewRequirement?: number | null;
};

export type ItemLibraryQuery = {
  search?: string;
  category?: string;
  active?: boolean;
  sort?: "name" | "category" | "price" | "displayOrder";
  direction?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

export type BulkItemUpdate = {
  ids?: string[];
  category?: string;
  active?: boolean;
  pricePercent?: number;
  moveCategory?: string;
  laborHours?: number;
  disposalFee?: number;
  recyclable?: boolean;
};
