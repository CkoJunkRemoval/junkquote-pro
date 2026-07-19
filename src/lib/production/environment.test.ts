import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "./environment";
const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.com/junkquote",
  AUTH_SECRET: "a-secure-random-secret-that-is-over-32-characters",
  AUTH_URL: "https://app.example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  PRIVATE_ASSET_STORAGE_DRIVER: "local",
  PRIVATE_ASSET_STORAGE_ROOT: "/private/assets",
  EMAIL_PROVIDER: "resend",
  EMAIL_FROM: "no-reply@example.com",
  RESEND_API_KEY: "re_test_key",
  RESEND_WEBHOOK_SECRET: "whsec_dGVzdC1zZWNyZXQ=",
  BACKGROUND_WORKERS_ENABLED: "true",
};
describe("production environment", () => {
  it("accepts complete safe production configuration", () =>
    expect(validateProductionEnvironment(valid)).toMatchObject({
      production: true,
      databaseConfigured: true,
    }));
  it("rejects missing configuration without printing values", () =>
    expect(() =>
      validateProductionEnvironment({ NODE_ENV: "production" }),
    ).toThrow("DATABASE_URL is required"));
  it("rejects unsafe credentials and development settings", () =>
    expect(() =>
      validateProductionEnvironment({
        ...valid,
        AUTH_SECRET: "changeme",
        DEV_SEED_PASSWORD: "password",
      }),
    ).toThrow("AUTH_SECRET"));
  it("requires HTTPS canonical URLs", () =>
    expect(() =>
      validateProductionEnvironment({
        ...valid,
        AUTH_URL: "http://app.example.com",
      }),
    ).toThrow("HTTPS"));
});
