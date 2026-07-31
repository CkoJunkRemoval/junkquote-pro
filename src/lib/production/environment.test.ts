import { describe, expect, it } from "vitest";
import {
  inspectProductionEnvironment,
  validateProductionEnvironment,
} from "./environment";
const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db.example.com/junkquote",
  DIRECT_URL: "postgresql://user:pass@direct.db.example.com/junkquote",
  AUTH_SECRET: "a-secure-random-secret-that-is-over-32-characters",
  AUTH_URL: "https://app.example.com",
  NEXT_PUBLIC_APP_URL: "https://app.example.com",
  PRIVATE_ASSET_STORAGE_DRIVER: "supabase",
  SUPABASE_STORAGE_URL: "https://storage.example.com",
  SUPABASE_SERVICE_ROLE_KEY: "service-role-value",
  SUPABASE_STORAGE_BUCKET: "private-assets",
  EMAIL_PROVIDER: "resend",
  EMAIL_FROM: "no-reply@example.com",
  RESEND_API_KEY: "re_test_key",
  RESEND_WEBHOOK_SECRET: "whsec_dGVzdC1zZWNyZXQ=",
  BACKGROUND_WORKERS_ENABLED: "true",
  STRIPE_SECRET_KEY: "sk_live_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example",
  STRIPE_PRICE_STARTER_MONTHLY: "price_starter_monthly",
  STRIPE_PRICE_STARTER_YEARLY: "price_starter_yearly",
  STRIPE_PRICE_PROFESSIONAL_MONTHLY: "price_professional_monthly",
  STRIPE_PRICE_PROFESSIONAL_YEARLY: "price_professional_yearly",
  STRIPE_PRICE_ENTERPRISE_MONTHLY: "price_enterprise_monthly",
  STRIPE_PRICE_ENTERPRISE_YEARLY: "price_enterprise_yearly",
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
  it("rejects local storage and Stripe test mode in production", () => {
    expect(
      inspectProductionEnvironment({
        ...valid,
        PRIVATE_ASSET_STORAGE_DRIVER: "local",
        STRIPE_SECRET_KEY: "sk_test_example",
      }).errors,
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining("local is unsafe"),
        expect.stringContaining("test-mode"),
      ]),
    );
  });
  it("requires runtime and direct migration URLs to target the same database", () => {
    expect(
      inspectProductionEnvironment({
        ...valid,
        DIRECT_URL: "postgresql://user:pass@direct.db.example.com/other",
      }).errors,
    ).toContain("DATABASE_URL and DIRECT_URL must target the same database.");
  });
  it("starts with warnings when optional services and a CSP override are absent", () => {
    const optionalNames = [
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
      "STRIPE_PRICE_STARTER_MONTHLY",
      "STRIPE_PRICE_STARTER_YEARLY",
      "STRIPE_PRICE_PROFESSIONAL_MONTHLY",
      "STRIPE_PRICE_PROFESSIONAL_YEARLY",
      "STRIPE_PRICE_ENTERPRISE_MONTHLY",
      "STRIPE_PRICE_ENTERPRISE_YEARLY",
      "KV_REST_API_URL",
      "KV_REST_API_TOKEN",
      "CONTENT_SECURITY_POLICY",
    ];
    const coreOnly = Object.fromEntries(
      Object.entries(valid).filter(([name]) => !optionalNames.includes(name)),
    );
    const status = inspectProductionEnvironment(coreOnly);
    expect(status.errors).toEqual([]);
    expect(status.features).toEqual({
      billing: false,
      redis: false,
      pushNotifications: false,
    });
    expect(status.contentSecurityPolicySource).toBe("safe-default");
    expect(status.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Stripe billing is disabled"),
        expect.stringContaining("Redis coordination is disabled"),
      ]),
    );
  });
  it("keeps platform administration configuration required", () => {
    const withoutAdmin = Object.fromEntries(
      Object.entries(valid).filter(([name]) => name !== "PLATFORM_ADMIN_EMAIL"),
    );
    expect(inspectProductionEnvironment(withoutAdmin).errors).toContain(
      "PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_EMAILS is required in production.",
    );
    expect(inspectProductionEnvironment({ ...withoutAdmin, PLATFORM_ADMIN_EMAILS: "admin@example.com" }).errors)
      .not.toContain("PLATFORM_ADMIN_EMAIL or PLATFORM_ADMIN_EMAILS is required in production.");
  });
});
