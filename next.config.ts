import type { NextConfig } from "next";
import { productionContentSecurityPolicy } from "./security-policy";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  async headers() {
    const security = [
      {
        key: "Content-Security-Policy",
        value: process.env.CONTENT_SECURITY_POLICY ?? productionContentSecurityPolicy,
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
    return [{ source: "/(.*)", headers: security }];
  },
};

export default nextConfig;
