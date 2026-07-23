import type { ItemLibraryInput } from "./types";

export const STANDARD_LIBRARY_VERSION = "1.0";

export const PRICING_MARKETS = {
  budget: { label: "Budget Market", multiplier: 0.9 },
  standard: { label: "Standard", multiplier: 1 },
  highCost: { label: "High Cost", multiplier: 1.15 },
  premium: { label: "Premium", multiplier: 1.3 },
} as const;

export type PricingMarket = keyof typeof PRICING_MARKETS;

type StandardItem = Pick<ItemLibraryInput, "category" | "name" | "basePrice"> &
  Partial<Omit<ItemLibraryInput, "category" | "name" | "basePrice">>;

const item = (value: StandardItem, displayOrder: number): ItemLibraryInput => ({
  description: null,
  active: true,
  displayOrder,
  disposalFee: 0,
  laborHours: 0.25,
  weightClass: "Medium",
  estimatedVolume: 0,
  recyclable: false,
  donationEligible: false,
  hazardous: false,
  refrigerant: false,
  electronics: false,
  mattress: false,
  tire: false,
  appliance: false,
  constructionDebris: false,
  yardWaste: false,
  requiresTwoPeople: false,
  requiresDisassembly: false,
  requiresSpecialEquipment: false,
  estimateRequired: false,
  notes: null,
  ...value,
});

const required = (category: string, name: string, displayOrder: number, extra: Partial<ItemLibraryInput> = {}) =>
  item({ category, name, basePrice: 0, estimateRequired: true, notes: "Estimator review required before quoting.", ...extra }, displayOrder);

export const DEFAULT_ITEM_LIBRARY: ItemLibraryInput[] = [
  item({ category: "Appliances", name: "Microwave", basePrice: 20, appliance: true, electronics: true, recyclable: true, laborHours: 0.15, weightClass: "Light" }, 10),
  item({ category: "Appliances", name: "Mini Refrigerator", basePrice: 40, disposalFee: 10, appliance: true, refrigerant: true, recyclable: true, laborHours: 0.35 }, 20),
  item({ category: "Appliances", name: "Dishwasher", basePrice: 40, disposalFee: 10, appliance: true, recyclable: true, laborHours: 0.5, weightClass: "Heavy", requiresTwoPeople: true }, 30),
  item({ category: "Appliances", name: "Dryer", basePrice: 55, disposalFee: 10, appliance: true, recyclable: true, laborHours: 0.5, weightClass: "Heavy", requiresTwoPeople: true }, 40),
  item({ category: "Appliances", name: "Washer", basePrice: 55, disposalFee: 10, appliance: true, recyclable: true, laborHours: 0.5, weightClass: "Heavy", requiresTwoPeople: true }, 50),
  item({ category: "Appliances", name: "Refrigerator", basePrice: 65, disposalFee: 15, appliance: true, refrigerant: true, recyclable: true, laborHours: 0.75, weightClass: "Heavy", requiresTwoPeople: true }, 60),
  item({ category: "Appliances", name: "Freezer", basePrice: 65, disposalFee: 15, appliance: true, refrigerant: true, recyclable: true, laborHours: 0.75, weightClass: "Heavy", requiresTwoPeople: true }, 70),
  item({ category: "Appliances", name: "Stove", basePrice: 60, disposalFee: 10, appliance: true, recyclable: true, laborHours: 0.6, weightClass: "Heavy", requiresTwoPeople: true }, 80),
  item({ category: "Appliances", name: "Water Heater", basePrice: 70, disposalFee: 10, appliance: true, recyclable: true, laborHours: 0.75, weightClass: "Extra Heavy", requiresTwoPeople: true }, 90),

  item({ category: "Furniture", name: "Dining Chair", basePrice: 15, donationEligible: true, laborHours: 0.1, weightClass: "Light" }, 110),
  item({ category: "Furniture", name: "Office Chair", basePrice: 20, donationEligible: true, laborHours: 0.15, weightClass: "Light" }, 120),
  item({ category: "Furniture", name: "Recliner", basePrice: 40, donationEligible: true, laborHours: 0.4, weightClass: "Heavy" }, 130),
  item({ category: "Furniture", name: "Loveseat", basePrice: 65, donationEligible: true, laborHours: 0.5, weightClass: "Heavy", requiresTwoPeople: true }, 140),
  item({ category: "Furniture", name: "Sofa", basePrice: 85, donationEligible: true, laborHours: 0.75, weightClass: "Heavy", requiresTwoPeople: true }, 150),
  item({ category: "Furniture", name: "Sleeper Sofa", basePrice: 125, disposalFee: 10, laborHours: 1, weightClass: "Extra Heavy", requiresTwoPeople: true }, 160),
  item({ category: "Furniture", name: "Sectional", basePrice: 150, laborHours: 1.25, weightClass: "Extra Heavy", requiresTwoPeople: true }, 170),
  item({ category: "Furniture", name: "Coffee Table", basePrice: 25, donationEligible: true, laborHours: 0.2 }, 180),
  item({ category: "Furniture", name: "End Table", basePrice: 15, donationEligible: true, laborHours: 0.1, weightClass: "Light" }, 190),
  item({ category: "Furniture", name: "Dining Table", basePrice: 60, donationEligible: true, laborHours: 0.5, weightClass: "Heavy", requiresDisassembly: true }, 200),
  item({ category: "Furniture", name: "Entertainment Center", basePrice: 70, donationEligible: true, laborHours: 0.75, weightClass: "Heavy", requiresTwoPeople: true }, 210),
  item({ category: "Furniture", name: "Bookshelf", basePrice: 40, donationEligible: true, laborHours: 0.35, weightClass: "Heavy" }, 220),

  item({ category: "Bedroom", name: "Twin Mattress", basePrice: 30, disposalFee: 10, mattress: true, laborHours: 0.2 }, 240),
  item({ category: "Bedroom", name: "Full Mattress", basePrice: 35, disposalFee: 10, mattress: true, laborHours: 0.25 }, 250),
  item({ category: "Bedroom", name: "Queen Mattress", basePrice: 40, disposalFee: 10, mattress: true, laborHours: 0.3, weightClass: "Heavy" }, 260),
  item({ category: "Bedroom", name: "King Mattress", basePrice: 45, disposalFee: 10, mattress: true, laborHours: 0.4, weightClass: "Heavy", requiresTwoPeople: true }, 270),
  item({ category: "Bedroom", name: "Box Spring", basePrice: 20, disposalFee: 5, mattress: true, laborHours: 0.2 }, 280),
  item({ category: "Bedroom", name: "Nightstand", basePrice: 20, donationEligible: true, laborHours: 0.15, weightClass: "Light" }, 290),
  item({ category: "Bedroom", name: "Dresser", basePrice: 55, donationEligible: true, laborHours: 0.5, weightClass: "Heavy" }, 300),
  item({ category: "Bedroom", name: "Armoire", basePrice: 75, donationEligible: true, laborHours: 0.75, weightClass: "Extra Heavy", requiresTwoPeople: true }, 310),
  item({ category: "Bedroom", name: "Bed Frame", basePrice: 35, recyclable: true, laborHours: 0.4, requiresDisassembly: true }, 320),

  item({ category: "Electronics", name: "TV under 40 inches", basePrice: 20, disposalFee: 5, recyclable: true, electronics: true, laborHours: 0.15, weightClass: "Light" }, 340),
  item({ category: "Electronics", name: "TV 40–60 inches", basePrice: 35, disposalFee: 8, recyclable: true, electronics: true, laborHours: 0.25 }, 350),
  item({ category: "Electronics", name: "TV over 60 inches", basePrice: 50, disposalFee: 10, recyclable: true, electronics: true, laborHours: 0.4, weightClass: "Heavy", requiresTwoPeople: true }, 360),
  item({ category: "Electronics", name: "Computer", basePrice: 15, disposalFee: 5, recyclable: true, electronics: true, laborHours: 0.1, weightClass: "Light" }, 370),
  item({ category: "Electronics", name: "Printer", basePrice: 10, disposalFee: 3, recyclable: true, electronics: true, laborHours: 0.1, weightClass: "Light" }, 380),
  item({ category: "Electronics", name: "Stereo", basePrice: 20, disposalFee: 5, recyclable: true, electronics: true, laborHours: 0.15 }, 390),

  item({ category: "Outdoor", name: "Push Mower", basePrice: 40, recyclable: true, laborHours: 0.3, weightClass: "Heavy" }, 410),
  item({ category: "Outdoor", name: "Riding Mower", basePrice: 125, recyclable: true, laborHours: 1, weightClass: "Extra Heavy", requiresSpecialEquipment: true, requiresTwoPeople: true }, 420),
  item({ category: "Outdoor", name: "Grill", basePrice: 35, recyclable: true, laborHours: 0.3, weightClass: "Heavy" }, 430),
  item({ category: "Outdoor", name: "Patio Chair", basePrice: 15, donationEligible: true, laborHours: 0.1, weightClass: "Light" }, 440),
  item({ category: "Outdoor", name: "Patio Table", basePrice: 30, donationEligible: true, laborHours: 0.25 }, 450),
  item({ category: "Hot Tub", name: "Hot Tub", basePrice: 350, disposalFee: 75, laborHours: 3, weightClass: "Extra Heavy", requiresDisassembly: true, requiresSpecialEquipment: true, requiresTwoPeople: true }, 460),
  required("Sheds", "Large Shed", 470, { constructionDebris: true, requiresDisassembly: true, requiresSpecialEquipment: true, weightClass: "Extra Heavy" }),

  item({ category: "Yard Waste", name: "Bag of Debris", basePrice: 10, yardWaste: true, laborHours: 0.1, weightClass: "Light" }, 490),
  required("Yard Waste", "Large Brush Pile", 500, { yardWaste: true }),
  required("Yard Waste", "Tree Limbs", 510, { yardWaste: true }),

  required("Construction", "Drywall", 530, { constructionDebris: true }),
  required("Concrete", "Concrete", 540, { constructionDebris: true, weightClass: "Extra Heavy", requiresSpecialEquipment: true }),
  required("Roofing", "Roofing", 550, { constructionDebris: true, weightClass: "Heavy" }),
  required("Dirt", "Dirt", 560, { constructionDebris: true, weightClass: "Extra Heavy", requiresSpecialEquipment: true }),
  required("Miscellaneous", "Whole House Cleanout", 580),
  required("Construction", "Demolition", 590, { constructionDebris: true, requiresSpecialEquipment: true }),
  required("Construction", "Large Deck", 600, { constructionDebris: true, requiresDisassembly: true, requiresSpecialEquipment: true }),
];

export function normalizePricingMarket(value: string): PricingMarket {
  if (value in PRICING_MARKETS) return value as PricingMarket;
  throw new Error("Select a valid pricing market.");
}

export function buildStandardItemLibrary(multiplier = 1) {
  if (!Number.isFinite(multiplier) || multiplier < 0.5 || multiplier > 2) {
    throw new Error("The library multiplier must be between 0.50 and 2.00.");
  }
  return DEFAULT_ITEM_LIBRARY.map((value) => ({
    ...value,
    basePrice: value.estimateRequired ? 0 : Math.round(value.basePrice * multiplier * 100) / 100,
    disposalFee: Math.round(value.disposalFee * multiplier * 100) / 100,
  }));
}

export function standardItemId(companyId: string, item: Pick<ItemLibraryInput, "category" | "name">) {
  const slug = `${item.category}-${item.name}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return `${companyId}:jq-standard:${slug}`;
}
