export const propertyTypes = [
  "Residential", "Apartment", "Commercial", "Storage Unit",
  "Construction Site", "Rental Property", "Other",
] as const;

export type PropertyInput = {
  customerId: string; nickname?: string; propertyType?: string;
  address: string; addressLine2?: string; city: string; state: string; zip: string;
  country?: string; gateCode?: string; parkingNotes?: string; accessNotes?: string;
  hazardNotes?: string; notes?: string; serviceArea?: string; active?: boolean;
};
