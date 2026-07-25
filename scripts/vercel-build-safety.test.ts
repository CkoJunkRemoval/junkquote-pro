import { describe, expect, it } from "vitest";
import { productionDatabaseUrl } from "./vercel-build-safety.mjs";

describe("Vercel production migration target safety", () => {
  it("requires production runtime and direct PostgreSQL URLs", () => {
    expect(() => productionDatabaseUrl({})).toThrow("DIRECT_URL is required");
    expect(() => productionDatabaseUrl({ DIRECT_URL: "https://db.invalid", DATABASE_URL: "postgresql://db.invalid/junkquote" })).toThrow(
      "must use PostgreSQL",
    );
  });

  it("refuses DATABASE_URL_TEST and test/development databases", () => {
    const test = "postgresql://user:secret@db.example/junkquote_test";
    expect(() =>
      productionDatabaseUrl({ DATABASE_URL: test, DIRECT_URL: test, DATABASE_URL_TEST: test }),
    ).toThrow("equals DATABASE_URL_TEST");
    expect(() =>
      productionDatabaseUrl({
        DATABASE_URL: "postgresql://user:secret@db.example/junkquote_dev",
        DIRECT_URL: "postgresql://user:secret@direct.db.example/junkquote_dev",
      }),
    ).toThrow("test or development");
  });

  it("accepts a production database without exposing credentials", () => {
    expect(
      productionDatabaseUrl({
        DATABASE_URL: "postgresql://private-user:private-secret@db.example/junkquote_prod",
        DIRECT_URL: "postgresql://private-user:private-secret@direct.db.example/junkquote_prod",
        DATABASE_URL_TEST: "postgresql://private-user:private-secret@db.example/junkquote_test",
        VERCEL: "1",
      }),
    ).toEqual({
      value: "postgresql://private-user:private-secret@direct.db.example/junkquote_prod",
      database: "junkquote_prod",
      host: "direct.db.example",
      disposableVerification: false,
    });
  });
});
