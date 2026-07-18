const unsafeValues = new Set([
  "changeme",
  "password",
  "secret",
  "development",
  "dev-secret",
  "test-secret",
]);
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
    requireValue("PRIVATE_ASSET_STORAGE_ROOT");
    const email = requireValue("EMAIL_PROVIDER");
    requireValue("EMAIL_FROM");
    const workers = requireValue("BACKGROUND_WORKERS_ENABLED");
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
    if (storage && !["local", "s3"].includes(storage))
      errors.push("PRIVATE_ASSET_STORAGE_DRIVER must be local or s3.");
    if (email && email === "console")
      errors.push("EMAIL_PROVIDER=console is unsafe in production.");
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
