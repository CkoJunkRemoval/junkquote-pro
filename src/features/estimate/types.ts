import {
  EstimateStatus,
  TimelineEvent,
} from "./status";

export type CustomerType = "new" | "existing";

export type PropertyType =
  | "house"
  | "apartment"
  | "condo"
  | "commercial"
  | "storage"
  | "other";

export type JobSiteStatus =
  | "not-started"
  | "in-progress"
  | "completed";

export interface EstimateItem {
  id: string;

  itemId: string;

  quantity: number;

  name: string;

  category: string;

  notes: string;

  priceOverride?: number;
}

export interface JobSite {
  id: string;

  name: string;

  status: JobSiteStatus;

  customerNotes: string;

  crewNotes: string;

  internalNotes: string;

  photos: string[];

  items: EstimateItem[];

  subtotal: number;
}

export interface Customer {
  id?: string;

  firstName: string;

  lastName: string;

  phone: string;

  email: string;
}

export interface Property {
  type: PropertyType | "";

  address: string;

  city: string;

  state: string;

  zip: string;

  gateCode: string;

  notes: string;
}

export interface PricingSummary {
  subtotal: number;

  labor: number;

  disposal: number;

  discount: number;

  total: number;
}

export interface Estimate {
  customerType: CustomerType | null;

  customer: Customer;

  property: Property;

  jobSites: JobSite[];

  pricing: PricingSummary;

  status: EstimateStatus;

  timeline: TimelineEvent[];
}