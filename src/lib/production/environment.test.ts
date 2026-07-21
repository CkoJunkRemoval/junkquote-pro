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
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  STRIPE_PRICE_STARTER: "price_starter",
  STRIPE_PRICE_PROFESSIONAL: "price_professional",
  STRIPE_PRICE_BUSINESS: "price_business",
  PLATFORM_ADMIN_EMAIL: "platform-admin@example.com",
  CONTENT_SECURITY_POLICY: "default-src 'self'; frame-ancestors 'none'",
  KV_REST_API_URL: "https://redis.example.com",
  KV_REST_API_TOKEN: "test-token",
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
