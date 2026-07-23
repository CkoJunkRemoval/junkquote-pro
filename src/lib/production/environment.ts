import { productionContentSecurityPolicy } from "../../../security-policy";
import { validateContentSecurityPolicy } from "@/lib/security/adminSecurity";

const unsafeValues = new Set([
  "changeme",
  "password",
  "secret",
  "development",
  "dev-secret",
  "test-secret",
]);

export type RuntimeEnvironment = Record<string, string | undefined>;
export type OptionalFeature = "billing" | "redis" | "pushNotifications";
export type ProductionEnvironmentStatus = {
  production: boolean;
  errors: string[];
  warnings: string[];
  features: Record<OptionalFeature, boolean>;
  contentSecurityPolicy: string;
  contentSecurityPolicySource: "configured" | "safe-default";
};

const value = (env: RuntimeEnvironment, name: string) => env[name]?.trim();

export function inspectProductionEnvironment(
  env: RuntimeEnvironment = process.env,
): ProductionEnvironmentStatus {
  const production = env.NODE_ENV === "production";
  const errors: string[] = [];
  const warnings: string[] = [];
  const requireValue = (name: string) => {
    const configured = value(env, name);
    if (!configured)
      errors.push(`${name} is required${production ? " in production" : ""}.`);
    return configured;
  };

  const databaseUrl = requireValue("DATABASE_URL");
  const stripeNames = [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRICE_STARTER",
    "STRIPE_PRICE_PROFESSIONAL",
    "STRIPE_PRICE_BUSINESS",
  ];
  const stripeValues = stripeNames.map((name) => value(env, name));
  const stripeConfigured = stripeValues.every(Boolean);
  const stripePartiallyConfigured =
    stripeValues.some(Boolean) && !stripeConfigured;
  const redisUrl =
    value(env, "KV_REST_API_URL") || value(env, "UPSTASH_REDIS_REST_URL");
  const redisToken =
    value(env, "KV_REST_API_TOKEN") || value(env, "UPSTASH_REDIS_REST_TOKEN");
  const redisConfigured = Boolean(redisUrl && redisToken);
  const pushConfigured = Boolean(
    value(env, "PUSH_NOTIFICATIONS_ENABLED") === "true",
  );
  const cspOverride = value(env, "CONTENT_SECURITY_POLICY");
  const contentSecurityPolicy = cspOverride || productionContentSecurityPolicy;

  if (production) {
    const secret = requireValue("AUTH_SECRET");
    const authUrl = value(env, "AUTH_URL") || value(env, "NEXTAUTH_URL");
    if (!authUrl)
      errors.push("AUTH_URL or NEXTAUTH_URL is required in production.");
    const baseUrl = requireValue("NEXT_PUBLIC_APP_URL");
    const storage = requireValue("PRIVATE_ASSET_STORAGE_DRIVER");
    if (storage === "local") requireValue("PRIVATE_ASSET_STORAGE_ROOT");
    const email = requireValue("EMAIL_PROVIDER");
    requireValue("EMAIL_FROM");
    requireValue("PLATFORM_ADMIN_EMAIL");

    if (!stripeConfigured)
      warnings.push(
        stripePartiallyConfigured
          ? `Stripe billing is disabled because configuration is incomplete (${stripeNames.filter((name, index) => !stripeValues[index]).join(", ")} missing).`
          : "Stripe billing is disabled because Stripe is not configured.",
      );
    if (!redisConfigured)
      warnings.push(
        redisUrl || redisToken
          ? "Redis coordination is disabled because its URL/token pair is incomplete; using the bounded in-memory fallback."
          : "Redis coordination is disabled; using the bounded in-memory fallback.",
      );
    if (redisUrl && !redisUrl.startsWith("https://"))
      warnings.push(
        "Redis coordination is disabled because its URL does not use HTTPS/TLS.",
      );
    if (!pushConfigured)
      warnings.push(
        "Push notifications are disabled; other notification channels remain available.",
      );
    if (!cspOverride)
      warnings.push(
        "CONTENT_SECURITY_POLICY is not set; using the built-in safe production policy.",
      );

    const cspResult = validateContentSecurityPolicy(contentSecurityPolicy);
    if (!cspResult.valid) errors.push(...cspResult.errors);
    if (
      secret &&
      (secret.length < 32 || unsafeValues.has(secret.toLowerCase()))
    )
      errors.push(
        "AUTH_SECRET must be a non-default value of at least 32 characters.",
      );
    for (const [name, configured] of [
      ["AUTH_URL", authUrl],
      ["NEXT_PUBLIC_APP_URL", baseUrl],
    ] as const)
      if (configured && !/^https:\/\//i.test(configured))
        errors.push(`${name} must use HTTPS in production.`);
    if (storage && !["local", "supabase"].includes(storage))
      errors.push("PRIVATE_ASSET_STORAGE_DRIVER must be local or supabase.");
    if (storage === "supabase") {
      requireValue("SUPABASE_STORAGE_URL");
      requireValue("SUPABASE_SERVICE_ROLE_KEY");
      requireValue("SUPABASE_STORAGE_BUCKET");
    }
    if (email === "console")
      errors.push("EMAIL_PROVIDER=console is unsafe in production.");
    if (email && email !== "resend")
      errors.push("EMAIL_PROVIDER must be resend in production.");
    if (email === "resend") {
      requireValue("RESEND_API_KEY");
      requireValue("RESEND_WEBHOOK_SECRET");
    }
    const workers = value(env, "BACKGROUND_WORKERS_ENABLED");
    if (workers && !["true", "false"].includes(workers))
      errors.push(
        "BACKGROUND_WORKERS_ENABLED must be true or false when configured.",
      );
    for (const name of [
      "DEVELOPMENT_COMPANY_ID",
      "DEV_SEED_EMAIL",
      "DEV_SEED_PASSWORD",
    ])
      if (env[name])
        errors.push(`${name} must not be configured in production.`);
    if (
      databaseUrl &&
      /localhost|127\.0\.0\.1|development|_dev(?:\?|$)/i.test(databaseUrl)
    )
      errors.push("DATABASE_URL appears to reference a development database.");
  }

  return {
    production,
    errors,
    warnings,
    features: {
      billing: stripeConfigured,
      redis: redisConfigured && Boolean(redisUrl?.startsWith("https://")),
      pushNotifications: pushConfigured,
    },
    contentSecurityPolicy,
    contentSecurityPolicySource: cspOverride ? "configured" : "safe-default",
  };
}

export function validateProductionEnvironment(
  env: RuntimeEnvironment = process.env,
) {
  const status = inspectProductionEnvironment(env);
  if (status.errors.length)
    throw new Error(
      `Environment validation failed:\n- ${status.errors.join("\n- ")}`,
    );
  if (status.production)
    for (const warning of status.warnings) console.warn(`[startup] ${warning}`);
  return {
    ...status,
    databaseConfigured: Boolean(value(env, "DATABASE_URL")),
    storageDriver: value(env, "PRIVATE_ASSET_STORAGE_DRIVER") ?? "local",
    workersEnabled: value(env, "BACKGROUND_WORKERS_ENABLED") === "true",
  };
}
