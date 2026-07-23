export const pricingRuleValueTypes = [
  "FlatFee", "Percentage", "PerItem", "PerCubicYard", "PerLaborHour",
  "PerCrewMember", "Multiplier", "Discount",
] as const;
export const pricingRuleModes = ["Automatic", "Optional"] as const;
export const pricingRuleFields = [
  "propertyType", "itemCategory", "itemFlag", "minimumQuantity", "maximumQuantity",
  "customerType", "crewSize", "serviceArea", "distance", "floor", "estimateTotal",
] as const;
export const pricingRuleOperators = ["equals", "notEquals", "greaterThan", "greaterThanOrEqual", "lessThan", "lessThanOrEqual"] as const;

export type RuleConditionInput = {
  field: (typeof pricingRuleFields)[number];
  operator: (typeof pricingRuleOperators)[number];
  value: string;
  secondaryValue?: string | null;
  displayOrder: number;
};

export type PricingRuleInput = {
  pricingProfileId?: string | null;
  name: string;
  description?: string | null;
  active: boolean;
  priority: number;
  category: string;
  applicationMode: (typeof pricingRuleModes)[number];
  valueType: (typeof pricingRuleValueTypes)[number];
  value: number;
  maxValue?: number | null;
  minimumEstimate?: number | null;
  maximumEstimate?: number | null;
  taxable: boolean;
  conditions: RuleConditionInput[];
};

export type PricingRuleItemContext = {
  category: string;
  quantity: number;
  estimatedVolume: number;
  laborHours: number;
  flags: Record<string, boolean>;
};

export type PricingRuleContext = {
  propertyType?: string | null;
  customerType?: string | null;
  crewSize: number;
  serviceArea?: string | null;
  distance?: number | null;
  floor?: number | null;
  estimateTotal: number;
  items: PricingRuleItemContext[];
};

export type EvaluatableRule = Omit<PricingRuleInput, "conditions"> & {
  id: string;
  conditions: RuleConditionInput[];
};

export type EvaluatedPricingRule = {
  pricingRuleId: string;
  name: string;
  category: string;
  calculationType: string;
  value: number;
  calculatedAmount: number;
  taxable: boolean;
  displayOrder: number;
  reason: string;
};
