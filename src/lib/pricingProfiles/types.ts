export type PricingProfileInput = {
  name: string;
  description?: string | null;
  minimumCharge: number;
  tripFee: number;
  laborRate: number;
  dumpFee: number;
  mileageRate: number;
  fuelSurcharge: number;
  defaultCrewSize: number;
  taxEnabled: boolean;
  taxRate: number;
  currency: string;
  displayOrder: number;
};

export type PricingProfileDefaults = {
  minimumCharge: number;
  tripFee: number;
  laborRate: number;
  dumpFee: number;
  mileageRate: number;
  fuelSurcharge: number;
  defaultCrewSize: number;
  taxEnabled: boolean;
  taxRate: number;
  currency: string;
};
