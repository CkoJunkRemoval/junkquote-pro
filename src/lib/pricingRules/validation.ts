import { pricingRuleFields, pricingRuleModes, pricingRuleOperators, pricingRuleValueTypes, type PricingRuleInput } from "./types";

export function validatePricingRule(input: PricingRuleInput) {
  const errors: string[] = [];
  if (!input.name.trim()) errors.push("Rule name is required.");
  if (!input.category.trim()) errors.push("Category is required.");
  if (!pricingRuleModes.includes(input.applicationMode)) errors.push("Application mode is invalid.");
  if (!pricingRuleValueTypes.includes(input.valueType)) errors.push("Calculation type is invalid.");
  if (!Number.isFinite(input.value) || input.value < 0) errors.push("Value must be zero or greater.");
  for (const [label, value] of [["Maximum value", input.maxValue], ["Minimum estimate", input.minimumEstimate], ["Maximum estimate", input.maximumEstimate]] as const)
    if (value !== null && value !== undefined && (!Number.isFinite(value) || value < 0)) errors.push(`${label} must be zero or greater.`);
  if (input.minimumEstimate != null && input.maximumEstimate != null && input.minimumEstimate > input.maximumEstimate) errors.push("Minimum estimate cannot exceed maximum estimate.");
  if (!Number.isInteger(input.priority)) errors.push("Priority must be a whole number.");
  for (const condition of input.conditions) {
    if (!pricingRuleFields.includes(condition.field)) errors.push("Condition field is invalid.");
    if (!pricingRuleOperators.includes(condition.operator)) errors.push("Condition operator is invalid.");
    if (!condition.value.trim()) errors.push("Condition value is required.");
    if (numericCondition(condition.field) && !Number.isFinite(Number(condition.value))) errors.push(`${condition.field} requires a number.`);
    if ((condition.field === "itemFlag" || condition.field === "itemCategory") && !["equals", "notEquals"].includes(condition.operator)) errors.push(`${condition.field} only supports equals or not equals.`);
  }
  if (errors.length) throw new Error(errors.join(" "));
}
const numericCondition = (field: string) => ["minimumQuantity", "maximumQuantity", "crewSize", "distance", "floor", "estimateTotal"].includes(field);
