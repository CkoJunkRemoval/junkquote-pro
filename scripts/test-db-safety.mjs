const canonical = (value) => {
  const url = new URL(value);
  url.hash = "";
  return url.toString();
};
/** @param {Record<string, string | undefined>} environment */
export function requireSafeTestDatabaseUrl(environment = process.env) {
  const testValue = environment.DATABASE_URL_TEST,
    developmentValue = environment.DATABASE_URL;
  if (!testValue)
    throw new Error(
      "DATABASE_URL_TEST is required; refusing database operation.",
    );
  if (!developmentValue)
    throw new Error("DATABASE_URL is required for distinctness verification.");
  if (canonical(testValue) === canonical(developmentValue))
    throw new Error("DATABASE_URL_TEST must not equal DATABASE_URL.");
  const testUrl = new URL(testValue),
    developmentUrl = new URL(developmentValue);
  if (!["postgres:", "postgresql:"].includes(testUrl.protocol))
    throw new Error("DATABASE_URL_TEST must be PostgreSQL.");
  const testDatabase = decodeURIComponent(
      testUrl.pathname.slice(1),
    ).toLowerCase(),
    developmentDatabase = decodeURIComponent(
      developmentUrl.pathname.slice(1),
    ).toLowerCase();
  if (!testDatabase || !testDatabase.includes("test"))
    throw new Error("Test database name must contain 'test'.");
  if (["postgres", "template0", "template1"].includes(testDatabase))
    throw new Error("Refusing a PostgreSQL system database.");
  if (testDatabase === developmentDatabase)
    throw new Error("Test and development database names must differ.");
  const allowedHosts = new Set(
    (environment.TEST_DATABASE_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  const allowedNames = new Set(
    (environment.TEST_DATABASE_ALLOWED_NAMES ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!allowedHosts.has(testUrl.hostname.toLowerCase()))
    throw new Error(
      "DATABASE_URL_TEST host is not explicitly approved for destructive tests.",
    );
  if (!allowedNames.has(testDatabase))
    throw new Error(
      "DATABASE_URL_TEST name is not explicitly approved for destructive tests.",
    );
  return {
    testValue,
    testDatabase,
    developmentDatabase,
    testHost: testUrl.hostname,
  };
}
