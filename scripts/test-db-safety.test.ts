import { describe, expect, it } from "vitest";
import { requireSafeTestDatabaseUrl } from "./test-db-safety.mjs";

const development = "postgresql://user:pass@example.test/neondb";
const test = "postgresql://user:pass@example.test/junkquote_pro_test";
describe("test database destructive-operation guard", () => {
  it("accepts only a distinct explicitly named test database", () => expect(requireSafeTestDatabaseUrl({ DATABASE_URL: development, DATABASE_URL_TEST: test })).toMatchObject({ testDatabase: "junkquote_pro_test", developmentDatabase: "neondb" }));
  it("refuses an empty test URL", () => expect(() => requireSafeTestDatabaseUrl({ DATABASE_URL: development })).toThrow("DATABASE_URL_TEST is required"));
  it("refuses the development URL", () => expect(() => requireSafeTestDatabaseUrl({ DATABASE_URL: development, DATABASE_URL_TEST: development })).toThrow("must not equal"));
  it("refuses unsafe database names and different server accounts", () => { expect(() => requireSafeTestDatabaseUrl({ DATABASE_URL: development, DATABASE_URL_TEST: "postgresql://user:pass@example.test/postgres" })).toThrow(); expect(() => requireSafeTestDatabaseUrl({ DATABASE_URL: development, DATABASE_URL_TEST: "postgresql://user:pass@other.test/safe_test" })).toThrow(); });
});
