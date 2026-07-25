/** @param {Record<string, string | undefined>} environment */
export function productionDatabaseUrl(environment = process.env) {
  const value = environment.DIRECT_URL;
  if (!value)
    throw new Error("DIRECT_URL is required for production migration deployment.");
  const runtimeValue = environment.DATABASE_URL;
  if (!runtimeValue)
    throw new Error("DATABASE_URL is required for production runtime.");
  if (environment.DATABASE_URL_TEST && value === environment.DATABASE_URL_TEST)
    throw new Error(
      "Refusing to deploy migrations: DATABASE_URL equals DATABASE_URL_TEST.",
    );
  const parsed = new URL(value);
  if (!["postgres:", "postgresql:"].includes(parsed.protocol))
    throw new Error("DATABASE_URL must use PostgreSQL.");
  const database = decodeURIComponent(parsed.pathname.slice(1)).toLowerCase();
  const runtimeDatabase = decodeURIComponent(
    new URL(runtimeValue).pathname.slice(1),
  ).toLowerCase();
  if (runtimeDatabase !== database)
    throw new Error("DATABASE_URL and DIRECT_URL must target the same database.");
  const disposableVerification =
    environment.VERCEL_BUILD_DISPOSABLE_VERIFY === "true" &&
    environment.VERCEL !== "1" &&
    database.startsWith("junkquote_vercel_verify_");
  if (!database || /(^|[_-])(test|dev|development)([_-]|$)/.test(database))
    throw new Error(
      "Refusing to deploy migrations to a test or development database.",
    );
  if (
    database.startsWith("junkquote_vercel_verify_") &&
    !disposableVerification
  )
    throw new Error(
      "Disposable verification databases are not valid production targets.",
    );
  if (["postgres", "template0", "template1"].includes(database))
    throw new Error(
      "Refusing to deploy migrations to a PostgreSQL system database.",
    );
  return { value, database, host: parsed.hostname, disposableVerification };
}
