export type ItemCategory =
  | "Appliance"
  | "Furniture"
  | "Electronics"
  | "Outdoor"
  | "Construction"
  | "Household"
  | "Yard"
  | "Mattress"
  | "Metal"
  | "Misc";

export type WeightClass =
  | "Light"
  | "Medium"
  | "Heavy"
  | "Extra Heavy";

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;

  commonAreas: string[];

  volume: number;

  weightClass: WeightClass;

  recyclable: boolean;

  donationEligible: boolean;

  requiresTwoPeople: boolean;

  basePrice: number;

  disposalFee: number;

  metalValue: boolean;
}

export const ITEM_LIBRARY: ItemDefinition[] = [
  {
    id: "refrigerator",
    name: "Refrigerator",
    category: "Appliance",

    commonAreas: [
      "Garage",
      "Kitchen",
      "Basement",
    ],

    volume: 25,
    weightClass: "Heavy",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: true,

    basePrice: 125,
    disposalFee: 25,

    metalValue: true,
  },

  {
    id: "freezer",
    name: "Freezer",
    category: "Appliance",

    commonAreas: [
      "Garage",
      "Basement",
    ],

    volume: 22,
    weightClass: "Heavy",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: true,

    basePrice: 120,
    disposalFee: 25,

    metalValue: true,
  },

  {
    id: "washer",
    name: "Washer",
    category: "Appliance",

    commonAreas: [
      "Garage",
      "Laundry Room",
      "Basement",
    ],

    volume: 15,
    weightClass: "Heavy",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: true,

    basePrice: 95,
    disposalFee: 20,

    metalValue: true,
  },

  {
    id: "dryer",
    name: "Dryer",
    category: "Appliance",

    commonAreas: [
      "Garage",
      "Laundry Room",
      "Basement",
    ],

    volume: 15,
    weightClass: "Heavy",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: true,

    basePrice: 90,
    disposalFee: 20,

    metalValue: true,
  },

  {
    id: "mattress",
    name: "Mattress",
    category: "Mattress",

    commonAreas: [
      "Bedroom",
    ],

    volume: 18,
    weightClass: "Medium",

    recyclable: false,
    donationEligible: false,

    requiresTwoPeople: false,

    basePrice: 85,
    disposalFee: 35,

    metalValue: false,
  },

  {
    id: "box",
    name: "Boxes",
    category: "Household",

    commonAreas: [
      "Garage",
      "Attic",
      "Basement",
      "Bedroom",
    ],

    volume: 2,
    weightClass: "Light",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: false,

    basePrice: 8,
    disposalFee: 0,

    metalValue: false,
  },

  {
    id: "tires",
    name: "Tires",
    category: "Outdoor",

    commonAreas: [
      "Garage",
      "Backyard",
    ],

    volume: 4,
    weightClass: "Medium",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: false,

    basePrice: 20,
    disposalFee: 8,

    metalValue: false,
  },

  {
    id: "couch",
    name: "Couch",
    category: "Furniture",

    commonAreas: [
      "Living Room",
      "Basement",
    ],

    volume: 35,
    weightClass: "Extra Heavy",

    recyclable: false,
    donationEligible: true,

    requiresTwoPeople: true,

    basePrice: 175,
    disposalFee: 30,

    metalValue: false,
  },

  {
    id: "dresser",
    name: "Dresser",
    category: "Furniture",

    commonAreas: [
      "Bedroom",
    ],

    volume: 18,
    weightClass: "Heavy",

    recyclable: false,
    donationEligible: true,

    requiresTwoPeople: false,

    basePrice: 95,
    disposalFee: 15,

    metalValue: false,
  },

  {
    id: "television",
    name: "Television",
    category: "Electronics",

    commonAreas: [
      "Living Room",
      "Bedroom",
    ],

    volume: 6,
    weightClass: "Medium",

    recyclable: true,
    donationEligible: false,

    requiresTwoPeople: false,

    basePrice: 40,
    disposalFee: 10,

    metalValue: false,
  },
];