export type CustomerType = "new" | "existing";

export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "commercial"
  | "storage";

export interface Estimate {
  customerType: CustomerType | null;

  customer: {
    id?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };

  property: {
    type: PropertyType | "";
    address: string;
    city: string;
    state: string;
    zip: string;
    gateCode: string;
    notes: string;
  };

  jobSites: {
    id: string;
    name: string;
    notes: string;
    photos: string[];
  }[];

  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];

  pricing: {
    subtotal: number;
    labor: number;
    disposal: number;
    discount: number;
    total: number;
  };

  approved: boolean;
}