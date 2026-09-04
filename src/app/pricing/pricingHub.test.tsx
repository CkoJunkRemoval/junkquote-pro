import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "@/auth.config";
import PricingComparisonOverview from "@/components/marketing/PricingComparisonOverview";
import PricingCrewCallout from "@/components/marketing/PricingCrewCallout";
import { plans } from "@/lib/billing/config";
import { comparisonPages } from "@/lib/marketing/comparison";
import ComparePage, { metadata as compareMetadata } from "../compare/page";
import sitemap from "../sitemap";
import Home from "../page";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public pricing and comparison hub", () => {
  it("routes both visible homepage pricing entry points to the separate comparison page", () => {
    const html = renderToStaticMarkup(<Home />);
    const pricingEntry = html.match(/<a[^>]*aria-label="Pricing and software comparisons"[^>]*>.*?<\/a>/)?.[0];
    expect(pricingEntry).toContain('href="/compare"');
    expect(pricingEntry).toContain("Pricing");
    expect(pricingEntry).toContain("w-full");
    expect(pricingEntry).toContain("sm:w-auto");
    expect(html).toMatch(/href="\/compare"[^>]*><span>View Pricing &amp; Compare<\/span>/);
    expect(html).not.toMatch(/href="\/pricing"[^>]*>(?:<span>)?(?:Pricing|View Pricing)/);
  });

  it("creates a public /compare route with unique social metadata", () => {
    const html = renderToStaticMarkup(<ComparePage />);
    expect(isPublicAuthPath("/compare")).toBe(true);
    expect(html).toContain("Pricing &amp; Software Comparison");
    expect(compareMetadata.title).toEqual({ absolute: "JunkQuote Pro Pricing & Software Comparison" });
    expect(compareMetadata.alternates?.canonical).toBe("/compare");
    expect(compareMetadata.openGraph?.url).toBe("/compare");
    expect(compareMetadata.twitter?.title).toBeTruthy();
  });

  it("keeps public plan rendering and the crew callout tied to authoritative pricing", () => {
    const compareSource = source("src/app/compare/page.tsx");
    const callout = renderToStaticMarkup(<PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} />);
    expect(compareSource).toContain("Object.values(plans)");
    expect(compareSource).toContain("plans.Professional.monthlyCents");
    for (const plan of Object.values(plans)) expect(renderToStaticMarkup(<ComparePage />)).toContain(plan.name);
    expect(callout).toContain("3-person crew");
    expect(callout).toContain("10-person crew");
    expect(callout.match(/\$89\/month total/g)).toHaveLength(2);
  });

  it("renders all four companies and links to every detailed comparison", () => {
    const html = renderToStaticMarkup(<PricingComparisonOverview />);
    for (const company of ["JunkQuote Pro", "Housecall Pro", "Jobber", "JunkIQ"]) expect(html).toContain(company);
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) expect(html).toContain(`href="${path}"`);
    expect(html).toContain('aria-label="Mobile software comparison"');
    expect(html).toContain("<table");
  });

  it("reuses verified competitor data without unsupported competitor prices", () => {
    expect(comparisonPages["housecall-pro"].overview.pricing).not.toMatch(/\$\d/);
    expect(comparisonPages.jobber.overview.pricing).not.toMatch(/\$\d/);
    expect(comparisonPages.junkiq.overview.pricing).toBe("$79/month");
  });

  it("keeps /pricing dedicated to authenticated PlanCards with a public fallback redirect", () => {
    const pricingSource = source("src/app/pricing/page.tsx");
    expect(pricingSource).toContain('redirect("/compare")');
    expect(pricingSource).toContain("<AppLayout>");
    expect(pricingSource).toContain("<PlanCards");
    expect(pricingSource).not.toContain("PricingComparisonOverview");
    expect(pricingSource).not.toContain("PricingCrewCallout");
    for (const path of ["src/components/navigation/Sidebar.tsx", "src/app/settings/billing/page.tsx", "src/app/billing/cancel/page.tsx", "src/app/actions/billing/billing.ts"]) expect(source(path)).toContain("/pricing");
  });

  it("uses /compare for prospect pricing links across the public marketing surface", () => {
    for (const path of ["src/app/features/page.tsx", "src/app/about/page.tsx", "src/components/marketing/ComparisonPage.tsx", "src/app/llms.txt/route.ts"]) {
      const publicSource = source(path);
      expect(publicSource).toContain("/compare");
      expect(publicSource).not.toContain('href="/pricing"');
    }
  });

  it("publishes /compare and all detailed comparisons without exposing /pricing in the public sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls).toContain("https://junkquoteprohq.com/compare");
    expect(urls).not.toContain("https://junkquoteprohq.com/pricing");
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) {
      expect(isPublicAuthPath(path)).toBe(true);
      expect(urls).toContain(`https://junkquoteprohq.com${path}`);
    }
  });

  it("does not alter estimate or item pricing modules", () => {
    const changed = source("src/app/compare/page.tsx");
    expect(changed).not.toMatch(/livePricingBreakdown|buildEstimateBreakdown|pricingRules|pricingProfiles/);
  });
});
