import { describe, expect, it } from "vitest";
import { requireSafeTestDatabaseUrl } from "./test-db-safety.mjs";
const base = {
  DATABASE_URL: "postgresql://user:pass@prod.example/prod",
  DATABASE_URL_TEST:
    "postgresql://test:test@127.0.0.1:55432/junkquote_pro_test",
  TEST_DATABASE_ALLOWED_HOSTS: "127.0.0.1",
  TEST_DATABASE_ALLOWED_NAMES: "junkquote_pro_test",
};
describe("test database safety", () => {
  it("accepts an explicitly approved disposable database", () =>
    expect(requireSafeTestDatabaseUrl(base)).toMatchObject({
      testDatabase: "junkquote_pro_test",
    }));
  it("rejects production equality", () =>
    expect(() =>
      requireSafeTestDatabaseUrl({
        ...base,
        DATABASE_URL_TEST: base.DATABASE_URL,
        TEST_DATABASE_ALLOWED_HOSTS: "prod.example",
        TEST_DATABASE_ALLOWED_NAMES: "prod",
      }),
    ).toThrow("must not equal"));
  it("rejects unapproved hosts and names", () => {
    expect(() =>
      requireSafeTestDatabaseUrl({
        ...base,
        TEST_DATABASE_ALLOWED_HOSTS: "localhost",
      }),
    ).toThrow("host");
    expect(() =>
      requireSafeTestDatabaseUrl({
        ...base,
        TEST_DATABASE_ALLOWED_NAMES: "other_test",
      }),
    ).toThrow("name");
  });
});
