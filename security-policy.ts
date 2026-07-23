function storageImageOrigin(value: string | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

export function buildProductionContentSecurityPolicy(storageUrl?: string) {
  const storageOrigin = storageImageOrigin(storageUrl);
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    `img-src 'self' data: blob:${storageOrigin ? ` ${storageOrigin}` : ""}`,
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline' https://js.stripe.com",
    "worker-src 'self' blob:",
    "connect-src 'self' https://api.stripe.com https://*.supabase.co https://*.vercel-insights.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "upgrade-insecure-requests",
  ].join("; ");
}

export const productionContentSecurityPolicy =
  buildProductionContentSecurityPolicy(process.env.SUPABASE_STORAGE_URL);
