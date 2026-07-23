import type { ItemLibraryInput } from "./types";

const base = {
  description: null, active: true, hazardous: false, constructionDebris: false,
  yardWaste: false, requiresDisassembly: false, requiresSpecialEquipment: false,
  notes: null,
};

export const DEFAULT_ITEM_LIBRARY: ItemLibraryInput[] = [
  { ...base, category: "Appliances", name: "Refrigerator", displayOrder: 10, basePrice: 125, disposalFee: 25, laborHours: .75, weightClass: "Heavy", estimatedVolume: 25, recyclable: true, donationEligible: false, refrigerant: true, electronics: false, mattress: false, tire: false, appliance: true, requiresTwoPeople: true },
  { ...base, category: "Appliances", name: "Freezer", displayOrder: 20, basePrice: 120, disposalFee: 25, laborHours: .75, weightClass: "Heavy", estimatedVolume: 22, recyclable: true, donationEligible: false, refrigerant: true, electronics: false, mattress: false, tire: false, appliance: true, requiresTwoPeople: true },
  { ...base, category: "Appliances", name: "Washer", displayOrder: 30, basePrice: 95, disposalFee: 20, laborHours: .5, weightClass: "Heavy", estimatedVolume: 15, recyclable: true, donationEligible: false, refrigerant: false, electronics: false, mattress: false, tire: false, appliance: true, requiresTwoPeople: true },
  { ...base, category: "Appliances", name: "Dryer", displayOrder: 40, basePrice: 90, disposalFee: 20, laborHours: .5, weightClass: "Heavy", estimatedVolume: 15, recyclable: true, donationEligible: false, refrigerant: false, electronics: false, mattress: false, tire: false, appliance: true, requiresTwoPeople: true },
  { ...base, category: "Household", name: "Mattress", displayOrder: 50, basePrice: 85, disposalFee: 35, laborHours: .4, weightClass: "Medium", estimatedVolume: 18, recyclable: false, donationEligible: false, refrigerant: false, electronics: false, mattress: true, tire: false, appliance: false, requiresTwoPeople: false },
  { ...base, category: "Household", name: "Boxes", displayOrder: 60, basePrice: 8, disposalFee: 0, laborHours: .1, weightClass: "Light", estimatedVolume: 2, recyclable: true, donationEligible: false, refrigerant: false, electronics: false, mattress: false, tire: false, appliance: false, requiresTwoPeople: false },
  { ...base, category: "Garage", name: "Tires", displayOrder: 70, basePrice: 20, disposalFee: 8, laborHours: .2, weightClass: "Medium", estimatedVolume: 4, recyclable: true, donationEligible: false, refrigerant: false, electronics: false, mattress: false, tire: true, appliance: false, requiresTwoPeople: false },
  { ...base, category: "Furniture", name: "Couch", displayOrder: 80, basePrice: 175, disposalFee: 30, laborHours: 1, weightClass: "Extra Heavy", estimatedVolume: 35, recyclable: false, donationEligible: true, refrigerant: false, electronics: false, mattress: false, tire: false, appliance: false, requiresTwoPeople: true },
  { ...base, category: "Furniture", name: "Dresser", displayOrder: 90, basePrice: 95, disposalFee: 15, laborHours: .5, weightClass: "Heavy", estimatedVolume: 18, recyclable: false, donationEligible: true, refrigerant: false, electronics: false, mattress: false, tire: false, appliance: false, requiresTwoPeople: false },
  { ...base, category: "Electronics", name: "Television", displayOrder: 100, basePrice: 40, disposalFee: 10, laborHours: .25, weightClass: "Medium", estimatedVolume: 6, recyclable: true, donationEligible: false, refrigerant: false, electronics: true, mattress: false, tire: false, appliance: false, requiresTwoPeople: false },
];
