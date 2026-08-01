import { describe, expect, it } from "vitest";
import { catalogEntryForPriceId, priceIdFor } from "./config";

const env: NodeJS.ProcessEnv = {
  ...process.env,
  STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
  STRIPE_PRICE_STARTER_YEARLY: "price_starter_yearly",
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_professional_monthly",
  STRIPE_PRICE_PROFESSIONAL_YEARLY: "price_professional_yearly",
  STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_enterprise_monthly",
  STRIPE_PRICE_ENTERPRISE_YEARLY: "price_enterprise_yearly",
};

describe("Stripe price mappings", () => {
  it.each([
    ["Starter", "Monthly", "price_starter_monthly"],
    ["Starter", "Yearly", "price_starter_yearly"],
    ["Professional", "Monthly", "price_professional_monthly"],
    ["Professional", "Yearly", "price_professional_yearly"],
    ["Enterprise", "Monthly", "price_enterprise_monthly"],
    ["Enterprise", "Yearly", "price_enterprise_yearly"],
  ] as const)("maps %s %s to its configured Price", (plan, interval, priceId) => {
    expect(priceIdFor(plan, interval, env)).toBe(priceId);
    expect(catalogEntryForPriceId(priceId, env)).toEqual({ plan, interval });
  });
});
