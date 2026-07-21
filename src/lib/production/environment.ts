const unsafeValues = new Set([
  "changeme",
  "password",
  "secret",
  "development",
  "dev-secret",
  "test-secret",
]);
import { validateContentSecurityPolicy } from "@/lib/security/adminSecurity";
export type RuntimeEnvironment = Record<string, string | undefined>;
export function validateProductionEnvironment(
  env: RuntimeEnvironment = process.env,
) {
  const production = env.NODE_ENV === "production";
  const errors: string[] = [];
  const requireValue = (name: string) => {
    const value = env[name]?.trim();
    if (!value)
      errors.push(`${name} is required${production ? " in production" : ""}.`);
    return value;
  };
  const databaseUrl = requireValue("DATABASE_URL");
  if (production) {
    const secret = requireValue("AUTH_SECRET");
    const authUrl = env.AUTH_URL?.trim() || env.NEXTAUTH_URL?.trim();
    if (!authUrl)
      errors.push("AUTH_URL or NEXTAUTH_URL is required in production.");
    const baseUrl = requireValue("NEXT_PUBLIC_APP_URL");
    const storage = requireValue("PRIVATE_ASSET_STORAGE_DRIVER");
    if (storage === "local") requireValue("PRIVATE_ASSET_STORAGE_ROOT");
    const email = requireValue("EMAIL_PROVIDER");
    requireValue("EMAIL_FROM");
    const workers = requireValue("BACKGROUND_WORKERS_ENABLED");
    requireValue("STRIPE_SECRET_KEY");
    requireValue("STRIPE_WEBHOOK_SECRET");
    requireValue("STRIPE_PRICE_STARTER");
    requireValue("STRIPE_PRICE_PROFESSIONAL");
    requireValue("STRIPE_PRICE_BUSINESS");
    requireValue("PLATFORM_ADMIN_EMAIL");
    const csp = requireValue("CONTENT_SECURITY_POLICY");
    const redisUrl = env.KV_REST_API_URL?.trim() || env.UPSTASH_REDIS_REST_URL?.trim();
    const redisToken = env.KV_REST_API_TOKEN?.trim() || env.UPSTASH_REDIS_REST_TOKEN?.trim();
    if (!redisUrl || !redisToken) errors.push("KV_REST_API_URL and KV_REST_API_TOKEN (or UPSTASH equivalents) are required in production.");
    if (redisUrl && !redisUrl.startsWith("https://")) errors.push("Distributed Redis must use HTTPS/TLS.");
    const cspResult = validateContentSecurityPolicy(csp);
    if (!cspResult.valid) errors.push(...cspResult.errors);
    if (
      secret &&
      (secret.length < 32 || unsafeValues.has(secret.toLowerCase()))
    )
      errors.push(
        "AUTH_SECRET must be a non-default value of at least 32 characters.",
      );
    for (const [name, value] of [
      ["AUTH_URL", authUrl],
      ["NEXT_PUBLIC_APP_URL", baseUrl],
    ] as const)
      if (value && !/^https:\/\//i.test(value))
        errors.push(`${name} must use HTTPS in production.`);
    if (storage && !["local", "supabase"].includes(storage))
      errors.push("PRIVATE_ASSET_STORAGE_DRIVER must be local or supabase.");
    if (storage === "supabase") {
      requireValue("SUPABASE_STORAGE_URL");
      requireValue("SUPABASE_SERVICE_ROLE_KEY");
      requireValue("SUPABASE_STORAGE_BUCKET");
    }
    if (email && email === "console")
      errors.push("EMAIL_PROVIDER=console is unsafe in production.");
    if (email && !["resend"].includes(email))
      errors.push("EMAIL_PROVIDER must be resend in production.");
    if (email === "resend") {
      requireValue("RESEND_API_KEY");
      requireValue("RESEND_WEBHOOK_SECRET");
    }
    if (workers && !["true", "false"].includes(workers))
      errors.push("BACKGROUND_WORKERS_ENABLED must be true or false.");
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
  if (errors.length)
    throw new Error(`Environment validation failed:\n- ${errors.join("\n- ")}`);
  return {
    production,
    databaseConfigured: Boolean(databaseUrl),
    storageDriver: env.PRIVATE_ASSET_STORAGE_DRIVER ?? "local",
    workersEnabled: env.BACKGROUND_WORKERS_ENABLED === "true",
  };
}
