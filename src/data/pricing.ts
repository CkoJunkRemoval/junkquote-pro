export interface PricingRules {
  minimumCharge: number;

  truckPricing: {
    pickup: number;
    trailer: number;
    quarterTruck: number;
    halfTruck: number;
    threeQuarterTruck: number;
    fullTruck: number;
  };

  labor: {
    hourlyRate: number;
    includedHours: number;
  };

  stairs: {
    enabled: boolean;
    pricePerFlight: number;
  };

  fuel: {
    enabled: boolean;
    surcharge: number;
  };

  discounts: {
    military: number;
    firstResponder: number;
    senior: number;
  };
}

export const DEFAULT_PRICING: PricingRules = {
  minimumCharge: 125,

  truckPricing: {
    pickup: 125,
    trailer: 175,
    quarterTruck: 225,
    halfTruck: 375,
    threeQuarterTruck: 525,
    fullTruck: 650,
  },

  labor: {
    hourlyRate: 75,
    includedHours: 2,
  },

  stairs: {
    enabled: true,
    pricePerFlight: 20,
  },

  fuel: {
    enabled: false,
    surcharge: 0,
  },

  discounts: {
    military: 10,
    firstResponder: 10,
    senior: 10,
  },
};