/** @param {Record<string, string | undefined>} environment */
export function requireSafeTestDatabaseUrl(environment = process.env) {
  const testValue = environment.DATABASE_URL_TEST;
  const developmentValue = environment.DATABASE_URL;
  if (!testValue) throw new Error("DATABASE_URL_TEST is required; refusing database operation.");
  if (!developmentValue) throw new Error("DATABASE_URL is required for distinctness verification.");
  if (testValue === developmentValue) throw new Error("DATABASE_URL_TEST must not equal DATABASE_URL.");
  const testUrl = new URL(testValue);
  const developmentUrl = new URL(developmentValue);
  if (!["postgres:", "postgresql:"].includes(testUrl.protocol)) throw new Error("DATABASE_URL_TEST must be PostgreSQL.");
  const testDatabase = decodeURIComponent(testUrl.pathname.slice(1)).toLowerCase();
  const developmentDatabase = decodeURIComponent(developmentUrl.pathname.slice(1)).toLowerCase();
  if (!testDatabase || !testDatabase.includes("test")) throw new Error("Test database name must contain 'test'.");
  if (["postgres", "template0", "template1"].includes(testDatabase)) throw new Error("Refusing a PostgreSQL system database.");
  if (testUrl.hostname !== developmentUrl.hostname || testUrl.port !== developmentUrl.port || testUrl.username !== developmentUrl.username) throw new Error("DATABASE_URL_TEST must use the explicitly provisioned test database on the configured test server account.");
  if (testDatabase === developmentDatabase) throw new Error("Test and development database names must differ.");
  return { testValue, testDatabase, developmentDatabase };
}
