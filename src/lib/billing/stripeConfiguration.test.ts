import { describe, expect, it } from "vitest";
import { inspectStripeConfiguration, stripeEnvironmentNames } from "./stripeConfiguration";

const live = {
  NODE_ENV: "production",
  STRIPE_SECRET_KEY: "sk_live_example",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
  STRIPE_PRICE_STARTER_YEARLY: "price_starter_yearly",
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_professional_monthly",
  STRIPE_PRICE_PROFESSIONAL_YEARLY: "price_professional_yearly",
  STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_enterprise_monthly",
  STRIPE_PRICE_ENTERPRISE_YEARLY: "price_enterprise_yearly",
};

describe("Stripe configuration inspection", () => {
  it("accepts complete live Production configuration", () => {
    expect(inspectStripeConfiguration(live)).toEqual({
      available: true,
      mode: "live",
      missingVariables: [],
      invalidPrefixes: [],
    });
  });

  it("reports exact missing variable names without values", () => {
    const env = { ...live, STRIPE_PRICE_PROFESSIONAL_MONTHLY: undefined };
    expect(inspectStripeConfiguration(env)).toMatchObject({
      available: false,
      missingVariables: ["STRIPE_PRICE_PROFESSIONAL_MONTHLY"],
    });
  });

  it("rejects mixed test and live credentials", () => {
    const result = inspectStripeConfiguration({
      ...live,
      NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
    });
    expect(result.available).toBe(false);
    expect(result.invalidPrefixes.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "STRIPE_SECRET_KEY",
        "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      ]),
    );
  });

  it("treats blank and whitespace-only values as missing", () => {
    const result = inspectStripeConfiguration({
      ...live,
      STRIPE_WEBHOOK_SECRET: "   ",
      STRIPE_PRICE_STARTER_YEARLY: "",
    });
    expect(result.missingVariables).toEqual([
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_PRICE_STARTER_YEARLY",
    ]);
  });

  it("accepts complete sandbox configuration outside Production", () => {
    const test = Object.fromEntries(
      stripeEnvironmentNames.map((name) => [name, live[name as keyof typeof live]]),
    ) as Record<string, string>;
    test.STRIPE_SECRET_KEY = "sk_test_example";
    test.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_example";
    expect(inspectStripeConfiguration({ NODE_ENV: "development", ...test })).toMatchObject({ available: true, mode: "test" });
  });
});
