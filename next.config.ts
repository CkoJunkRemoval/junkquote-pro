import type { NextConfig } from "next";
import { productionContentSecurityPolicy } from "./security-policy";

const defaultContentSecurityPolicy =
  process.env.NODE_ENV === "production"
    ? productionContentSecurityPolicy
    : productionContentSecurityPolicy.replace(
        "script-src 'self' 'unsafe-inline'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      );

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  experimental: {
    authInterrupts: true,
  },
  async redirects() {
    return [
      {
        source: "/:l([a-z0-9])",
        destination: "/?utm_source=heycatch&utm_campaign=:l",
        permanent: false,
      },
    ];
  },
  async headers() {
    const security = [
      {
        key: "Content-Security-Policy",
        value:
          process.env.CONTENT_SECURITY_POLICY ??
          defaultContentSecurityPolicy,
      },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      {
        key: "Permissions-Policy",
        value: "camera=(self), microphone=(), geolocation=()",
      },
      { key: "X-Content-Type-Options", value: "nosniff" },
      ...(process.env.NODE_ENV === "production"
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains",
            },
          ]
        : []),
    ];
    return [
      { source: "/(.*)", headers: security },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/icons/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
        ],
      },
      {
        source: "/portal/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
    ];
  },
};

export default nextConfig;
