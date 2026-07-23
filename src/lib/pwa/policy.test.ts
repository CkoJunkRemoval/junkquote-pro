import { describe, expect, it } from "vitest";
import {
  isSafePublicAsset,
  isSensitiveRoute,
  isStandalone,
  notificationPermissionState,
  shouldRegisterServiceWorker,
} from "./policy";

describe("PWA policy", () => {
  it("registers in production or explicit local testing only", () => {
    expect(shouldRegisterServiceWorker("production", undefined, true)).toBe(
      true,
    );
    expect(shouldRegisterServiceWorker("development", "true", true)).toBe(true);
    expect(shouldRegisterServiceWorker("development", undefined, true)).toBe(
      false,
    );
    expect(shouldRegisterServiceWorker("production", undefined, false)).toBe(
      false,
    );
  });
  it("detects standalone display modes", () => {
    expect(isStandalone(true, false)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, false)).toBe(false);
  });
  it("detects notification permission without prompting", () => {
    expect(notificationPermissionState(false)).toBe("unsupported");
    expect(notificationPermissionState(true, "denied")).toBe("denied");
  });
  it("allows only explicit public assets", () => {
    expect(isSafePublicAsset("/_next/static/chunks/app.js")).toBe(true);
    expect(isSafePublicAsset("/icons/icon-192.png")).toBe(true);
    expect(isSafePublicAsset("/dashboard")).toBe(false);
  });
  it.each([
    "/api/auth/session",
    "/api/webhooks/stripe",
    "/api/private/assets/company-logos/tenant-a/logo.png",
    "/portal/invoices/1",
    "/approve/token",
    "/dashboard",
    "/estimates/1",
    "/invoices/1",
    "/payments",
    "/system-admin",
  ])("excludes sensitive route %s", (path) =>
    expect(isSensitiveRoute(path)).toBe(true),
  );
});
