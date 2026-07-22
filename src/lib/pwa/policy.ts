export const PWA_CACHE_PREFIX = "junkquote-pwa";

export const PUBLIC_ASSET_PATHS = [
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icons/",
  "/_next/static/",
] as const;

export const SENSITIVE_PATH_PREFIXES = [
  "/api/",
  "/actions/",
  "/approve/",
  "/portal/",
  "/dashboard",
  "/estimate",
  "/customers",
  "/jobs",
  "/field",
  "/invoices",
  "/payments",
  "/accounts-receivable",
  "/settings",
  "/admin",
  "/system-admin",
  "/billing",
  "/auth",
  "/sign-in",
  "/sign-up",
  "/reset-password",
  "/operations",
  "/dispatch",
  "/schedule",
  "/reports",
  "/analytics",
] as const;

export function isSafePublicAsset(pathname: string) {
  return PUBLIC_ASSET_PATHS.some(
    (path) => pathname === path || pathname.startsWith(path),
  );
}

export function isSensitiveRoute(pathname: string) {
  return SENSITIVE_PATH_PREFIXES.some(
    (path) => pathname === path || pathname.startsWith(path),
  );
}

export function shouldRegisterServiceWorker(
  environment: string | undefined,
  localOptIn: string | undefined,
  supported: boolean,
) {
  return supported && (environment === "production" || localOptIn === "true");
}

export function isStandalone(
  displayMode: boolean,
  navigatorStandalone = false,
) {
  return displayMode || navigatorStandalone;
}

export function notificationPermissionState(
  supported: boolean,
  permission?: NotificationPermission,
) {
  return supported ? (permission ?? "default") : "unsupported";
}
