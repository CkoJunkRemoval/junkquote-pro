import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { isPublicAuthPath } from "@/auth.config";
import PricingComparisonOverview, { pricingOverviewCompanies } from "@/components/marketing/PricingComparisonOverview";
import PricingCrewCallout from "@/components/marketing/PricingCrewCallout";
import { plans } from "@/lib/billing/config";
import { comparisonPages } from "@/lib/marketing/comparison";
import sitemap from "../sitemap";
import Home from "../page";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("public pricing and comparison hub", () => {
  it("renders a distinct responsive homepage Pricing destination without toggle or reveal behavior", () => {
    const html = renderToStaticMarkup(<Home />);
    const homeSource = source("src/app/page.tsx");
    const pricingEntry = html.match(/<a[^>]*aria-label="Pricing and software comparisons"[^>]*>.*?<\/a>/)?.[0];
    expect(pricingEntry).toBeTruthy();
    expect(pricingEntry).toContain('href="/pricing"');
    expect(pricingEntry).toContain("Pricing");
    expect(pricingEntry).toContain("w-full");
    expect(pricingEntry).toContain("sm:w-auto");
    expect(pricingEntry).toContain("order-last");
    expect(pricingEntry).toContain("sm:order-none");
    expect(pricingEntry).toContain("focus-visible:outline");
    expect(pricingEntry).toContain("<svg");
    expect(html).toContain("View Pricing &amp; Compare");
    expect(homeSource).not.toMatch(/pricing.*(?:toggle|modal|reveal)|#pricing/i);
  });

  it("keeps the remodeled pricing comparison hub intact", () => {
    const pricingSource = source("src/app/pricing/page.tsx");
    expect(pricingSource).toContain("Simple pricing. See how JunkQuote Pro compares.");
    expect(pricingSource).toContain("<PricingComparisonOverview />");
  });

  it("keeps plan rendering and the crew callout tied to authoritative pricing", () => {
    const pricingSource = source("src/app/pricing/page.tsx");
    const callout = renderToStaticMarkup(<PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} />);
    expect(pricingSource).toContain("Object.values(plans)");
    expect(pricingSource).toContain("plans.Professional.monthlyCents");
    expect(plans.Professional.monthlyCents).toBe(8900);
    expect(callout).toContain("3-person crew");
    expect(callout).toContain("10-person crew");
    expect(callout.match(/\$89\/month total/g)).toHaveLength(2);
  });

  it("renders all four companies with mobile cards, a semantic desktop table, and detailed links", () => {
    const html = renderToStaticMarkup(<PricingComparisonOverview />);
    for (const company of ["JunkQuote Pro", "Housecall Pro", "Jobber", "JunkIQ"]) expect(html).toContain(company);
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) expect(html).toContain(`href="${path}"`);
    expect(html).toContain('aria-label="Mobile software comparison"');
    expect(html).toContain("<table");
    expect(html).toContain("<caption");
    expect(html).toContain("Full comparison →");
  });

  it("reuses verified competitor data without adding unsupported Housecall Pro or Jobber prices", () => {
    const companies = pricingOverviewCompanies();
    expect(companies.find((company) => company.name === "Housecall Pro")?.values.Pricing).toBe(comparisonPages["housecall-pro"].overview.pricing);
    expect(companies.find((company) => company.name === "Jobber")?.values.Pricing).toBe(comparisonPages.jobber.overview.pricing);
    const junkIq = companies.find((company) => company.name === "JunkIQ")?.values;
    expect(junkIq).toMatchObject({ Pricing: comparisonPages.junkiq.overview.pricing, Users: comparisonPages.junkiq.overview.users, Trial: comparisonPages.junkiq.overview.trial });
    expect(comparisonPages["housecall-pro"].overview.pricing).not.toMatch(/\$\d/);
    expect(comparisonPages.jobber.overview.pricing).not.toMatch(/\$\d/);
    expect(comparisonPages.junkiq.overview).toEqual({ pricing: "$79/month", users: "Unlimited users", trial: "7-day free trial" });
  });

  it("keeps comparison routes public and present in the sitemap", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) {
      expect(isPublicAuthPath(path)).toBe(true);
      expect(urls).toContain(`https://junkquoteprohq.com${path}`);
    }
    expect(isPublicAuthPath("/customers")).toBe(false);
  });
});
