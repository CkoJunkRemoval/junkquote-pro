import type { EvaluatableRule, EvaluatedPricingRule, PricingRuleContext, RuleConditionInput } from "./types";

const numericFields = new Set(["minimumQuantity", "maximumQuantity", "crewSize", "distance", "floor", "estimateTotal"]);
const compare = (actual: string | number | null | undefined, condition: RuleConditionInput) => {
  if (actual === null || actual === undefined) return false;
  const expected = numericFields.has(condition.field) ? Number(condition.value) : condition.value.toLowerCase();
  const value = typeof expected === "number" ? Number(actual) : String(actual).toLowerCase();
  if (typeof expected === "number" && (!Number.isFinite(expected) || !Number.isFinite(value as number))) return false;
  switch (condition.operator) {
    case "equals": return value === expected;
    case "notEquals": return value !== expected;
    case "greaterThan": return value > expected;
    case "greaterThanOrEqual": return value >= expected;
    case "lessThan": return value < expected;
    case "lessThanOrEqual": return value <= expected;
  }
};

function matchingItems(context: PricingRuleContext, conditions: RuleConditionInput[]) {
  const category = conditions.find((row) => row.field === "itemCategory");
  const flag = conditions.find((row) => row.field === "itemFlag");
  return context.items.filter((item) =>
    (!category || compare(item.category, category)) &&
    (!flag || compare(Object.entries(item.flags).find(([name]) => name.toLowerCase() === flag.value.toLowerCase())?.[1] ? flag.value : "", flag))
  );
}

function matches(rule: EvaluatableRule, context: PricingRuleContext) {
  if (rule.minimumEstimate !== null && rule.minimumEstimate !== undefined && context.estimateTotal < rule.minimumEstimate) return false;
  if (rule.maximumEstimate !== null && rule.maximumEstimate !== undefined && context.estimateTotal > rule.maximumEstimate) return false;
  const items = matchingItems(context, rule.conditions);
  return rule.conditions.every((condition) => {
    if (condition.field === "itemCategory" || condition.field === "itemFlag") return items.length > 0;
    if (condition.field === "minimumQuantity") return compare(items.reduce((sum, item) => sum + item.quantity, 0), { ...condition, operator: "greaterThanOrEqual" });
    if (condition.field === "maximumQuantity") return compare(items.reduce((sum, item) => sum + item.quantity, 0), { ...condition, operator: "lessThanOrEqual" });
    return compare(context[condition.field as keyof PricingRuleContext] as string | number | null, condition);
  });
}

export function calculateRuleAmount(rule: EvaluatableRule, context: PricingRuleContext) {
  const items = matchingItems(context, rule.conditions);
  const quantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const volume = items.length ? items.reduce((sum, item) => sum + item.estimatedVolume * item.quantity, 0) : context.items.reduce((sum, item) => sum + item.estimatedVolume * item.quantity, 0);
  const labor = items.length ? items.reduce((sum, item) => sum + item.laborHours * item.quantity, 0) : context.items.reduce((sum, item) => sum + item.laborHours * item.quantity, 0);
  let amount = rule.value;
  if (rule.valueType === "Percentage") amount = context.estimateTotal * rule.value / 100;
  if (rule.valueType === "PerItem") amount = quantity * rule.value;
  if (rule.valueType === "PerCubicYard") amount = volume * rule.value;
  if (rule.valueType === "PerLaborHour") amount = labor * rule.value;
  if (rule.valueType === "PerCrewMember") amount = context.crewSize * rule.value;
  if (rule.valueType === "Multiplier") amount = context.estimateTotal * (rule.value - 1);
  if (rule.valueType === "Discount") amount = -Math.abs(rule.value);
  if (rule.maxValue !== null && rule.maxValue !== undefined) amount = Math.sign(amount) * Math.min(Math.abs(amount), rule.maxValue);
  return Math.round(amount * 100) / 100;
}

export function evaluatePricingRules(rules: EvaluatableRule[], context: PricingRuleContext): EvaluatedPricingRule[] {
  return rules
    .filter((rule) => rule.active && rule.applicationMode === "Automatic" && matches(rule, context))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id))
    .map((rule, index) => ({
      pricingRuleId: rule.id, name: rule.name, category: rule.category,
      calculationType: rule.valueType, value: rule.value,
      calculatedAmount: calculateRuleAmount(rule, context), taxable: rule.taxable,
      displayOrder: index, reason: rule.conditions.length ? "Matched configured estimate conditions." : "Applied automatically.",
    }));
}
