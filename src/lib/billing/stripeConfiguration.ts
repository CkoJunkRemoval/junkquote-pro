export const stripeEnvironmentNames = [
  "STRIPE_SECRET_KEY",
  "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_STARTER_YEARLY",
  "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
  "STRIPE_PRICE_PROFESSIONAL_YEARLY",
  "STRIPE_PRICE_ENTERPRISE_MONTHLY",
  "STRIPE_PRICE_ENTERPRISE_YEARLY",
] as const;

export type StripeEnvironmentName = typeof stripeEnvironmentNames[number];
type Environment = Record<string, string | undefined>;

const expectedPrefixes: Record<StripeEnvironmentName, string> = {
  STRIPE_SECRET_KEY: "sk_live_ or sk_test_",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_ or pk_test_",
  STRIPE_WEBHOOK_SECRET: "whsec_",
  STRIPE_PRICE_STARTER_MONTHLY: "price_",
  STRIPE_PRICE_STARTER_YEARLY: "price_",
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_",
  STRIPE_PRICE_PROFESSIONAL_YEARLY: "price_",
  STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_",
  STRIPE_PRICE_ENTERPRISE_YEARLY: "price_",
};

export type StripeConfigurationStatus = {
  available: boolean;
  mode: "live" | "test" | null;
  missingVariables: StripeEnvironmentName[];
  invalidPrefixes: Array<{ name: StripeEnvironmentName; expected: string }>;
};

export function inspectStripeConfiguration(
  env: Environment = process.env,
  production = env.NODE_ENV === "production",
): StripeConfigurationStatus {
  const configured = Object.fromEntries(
    stripeEnvironmentNames.map((name) => [name, env[name]?.trim() ?? ""]),
  ) as Record<StripeEnvironmentName, string>;
  const missingVariables = stripeEnvironmentNames.filter(
    (name) => !configured[name],
  );
  const invalid = new Set<StripeEnvironmentName>();
  const matches: Record<StripeEnvironmentName, RegExp> = {
    STRIPE_SECRET_KEY: /^sk_(?:live|test)_/,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: /^pk_(?:live|test)_/,
    STRIPE_WEBHOOK_SECRET: /^whsec_./,
    STRIPE_PRICE_STARTER_MONTHLY: /^price_./,
    STRIPE_PRICE_STARTER_YEARLY: /^price_./,
    STRIPE_PRICE_PROFESSIONAL_MONTHLY: /^price_./,
    STRIPE_PRICE_PROFESSIONAL_YEARLY: /^price_./,
    STRIPE_PRICE_ENTERPRISE_MONTHLY: /^price_./,
    STRIPE_PRICE_ENTERPRISE_YEARLY: /^price_./,
  };
  for (const name of stripeEnvironmentNames)
    if (configured[name] && !matches[name].test(configured[name])) invalid.add(name);

  const secretMode = configured.STRIPE_SECRET_KEY.startsWith("sk_live_")
    ? "live"
    : configured.STRIPE_SECRET_KEY.startsWith("sk_test_") ? "test" : null;
  const publishableMode = configured.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_live_")
    ? "live"
    : configured.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY.startsWith("pk_test_") ? "test" : null;
  if (production && configured.STRIPE_SECRET_KEY && secretMode !== "live") invalid.add("STRIPE_SECRET_KEY");
  if (production && configured.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && publishableMode !== "live") invalid.add("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  if (secretMode && publishableMode && secretMode !== publishableMode) {
    invalid.add("STRIPE_SECRET_KEY");
    invalid.add("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY");
  }
  const invalidPrefixes = [...invalid].map((name) => ({
    name,
    expected: production && name === "STRIPE_SECRET_KEY"
      ? "sk_live_"
      : production && name === "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
        ? "pk_live_"
        : expectedPrefixes[name],
  }));
  return {
    available: missingVariables.length === 0 && invalidPrefixes.length === 0,
    mode: secretMode && secretMode === publishableMode ? secretMode : null,
    missingVariables,
    invalidPrefixes,
  };
}

export function stripeConfigurationDiagnostic(status: StripeConfigurationStatus) {
  return {
    missingVariableNames: status.missingVariables,
    invalidPrefixVariables: status.invalidPrefixes.map(({ name, expected }) => ({ name, expected })),
  };
}
