import {
  EstimateStatus,
  TimelineEvent,
} from "./status";
import type { PricingProfileDefaults } from "@/lib/pricingProfiles/types";

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

  libraryItemId?: string;
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
  id?: string;

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
  pricingProfileId: string;

  pricingProfileName: string;

  pricingDefaults: PricingProfileDefaults;

  pricingManuallyEdited: boolean;

  customerType: CustomerType | null;

  customer: Customer;

  property: Property;

  jobSites: JobSite[];

  pricing: PricingSummary;

  status: EstimateStatus;

  timeline: TimelineEvent[];
}
