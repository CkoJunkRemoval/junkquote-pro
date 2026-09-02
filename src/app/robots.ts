import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/marketing/metadata";

const privatePaths = [
  "/access-denied", "/accounts-receivable", "/admin", "/analytics", "/api", "/approve", "/billing", "/communications", "/crews", "/customers", "/dashboard", "/dispatch", "/employees", "/estimate", "/estimates", "/field", "/finance", "/fleet", "/invoices", "/jobs", "/join", "/offline", "/onboarding", "/operations", "/platform-admin", "/portal", "/properties", "/reports", "/reset-password", "/schedule", "/service-plans", "/settings", "/sign-in", "/sign-up", "/system-admin", "/tax", "/team",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: ["/", "/about", "/features", "/pricing"], disallow: privatePaths },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl.origin,
  };
}
