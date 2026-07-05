export type ItemCategory =
  | "Appliance"
  | "Furniture"
  | "Electronics"
  | "Outdoor"
  | "Construction"
  | "Household"
  | "Yard"
  | "Misc";

export interface ItemDefinition {
  id: string;
  name: string;
  category: ItemCategory;

  commonAreas: string[];

  heavy: boolean;

  recyclable: boolean;

  requiresTwoPeople: boolean;
}

export const ITEM_LIBRARY: ItemDefinition[] = [
  {
    id: "refrigerator",
    name: "Refrigerator",
    category: "Appliance",
    commonAreas: ["Garage", "Kitchen", "Basement"],
    heavy: true,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "freezer",
    name: "Freezer",
    category: "Appliance",
    commonAreas: ["Garage", "Basement"],
    heavy: true,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "washer",
    name: "Washer",
    category: "Appliance",
    commonAreas: ["Garage", "Laundry Room", "Basement"],
    heavy: true,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "dryer",
    name: "Dryer",
    category: "Appliance",
    commonAreas: ["Garage", "Laundry Room", "Basement"],
    heavy: true,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "mattress",
    name: "Mattress",
    category: "Furniture",
    commonAreas: ["Bedroom"],
    heavy: false,
    recyclable: false,
    requiresTwoPeople: false,
  },

  {
    id: "box",
    name: "Boxes",
    category: "Household",
    commonAreas: ["Garage", "Attic", "Basement", "Bedroom"],
    heavy: false,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "tires",
    name: "Tires",
    category: "Outdoor",
    commonAreas: ["Garage", "Backyard"],
    heavy: false,
    recyclable: true,
    requiresTwoPeople: false,
  },

  {
    id: "couch",
    name: "Couch",
    category: "Furniture",
    commonAreas: ["Living Room", "Basement"],
    heavy: true,
    recyclable: false,
    requiresTwoPeople: true,
  },

  {
    id: "dresser",
    name: "Dresser",
    category: "Furniture",
    commonAreas: ["Bedroom"],
    heavy: true,
    recyclable: false,
    requiresTwoPeople: false,
  },

  {
    id: "television",
    name: "Television",
    category: "Electronics",
    commonAreas: ["Living Room", "Bedroom"],
    heavy: false,
    recyclable: true,
    requiresTwoPeople: false,
  },
];