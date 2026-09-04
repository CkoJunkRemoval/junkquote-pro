import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "@/auth.config";
import ComparisonPage from "@/components/marketing/ComparisonPage";
import PricingCrewCallout from "@/components/marketing/PricingCrewCallout";
import { billingConfig, plans } from "@/lib/billing/config";
import { comparisonFaqs, comparisonPages } from "@/lib/marketing/comparison";
import sitemap from "./sitemap";
import HousecallPage, { metadata as housecallMetadata } from "./vs-housecall-pro/page";
import JobberPage, { metadata as jobberMetadata } from "./vs-jobber/page";
import JunkIqPage, { metadata as junkiqMetadata } from "./vs-junkiq/page";

const routePages = [HousecallPage, JobberPage, JunkIqPage];
const pageData = Object.values(comparisonPages);

describe("public competitor comparison pages", () => {
  it("creates all three public routes without exposing authenticated routes", () => {
    expect(routePages).toHaveLength(3);
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) expect(isPublicAuthPath(path)).toBe(true);
    for (const path of ["/dashboard", "/customers", "/invoices", "/team/timesheets"]) expect(isPublicAuthPath(path)).toBe(false);
  });

  it("provides unique titles, descriptions, canonicals, Open Graph, and Twitter metadata", () => {
    const entries = [housecallMetadata, jobberMetadata, junkiqMetadata];
    expect(new Set(entries.map((entry) => JSON.stringify(entry.title))).size).toBe(3);
    expect(new Set(entries.map((entry) => entry.description)).size).toBe(3);
    expect(entries.map((entry) => entry.alternates?.canonical)).toEqual(["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]);
    for (const entry of entries) {
      expect(entry.openGraph?.title).toBeTruthy();
      expect(entry.openGraph?.description).toBe(entry.description);
      expect(entry.twitter?.title).toBeTruthy();
      expect(entry.twitter?.description).toBe(entry.description);
    }
  });

  it("uses the authoritative Professional price and current trial behavior", () => {
    expect(plans.Professional).toMatchObject({ monthlyCents: 8900, userLimit: 10 });
    expect(billingConfig.trialDays).toBe(30);
    const pricingHtml = renderToStaticMarkup(<PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} />);
    expect(pricingHtml.match(/\$89\/month total/g)).toHaveLength(2);
    for (const data of pageData) {
      const html = renderToStaticMarkup(<ComparisonPage data={data} />);
      expect(html).toContain("$89/month total");
      expect(html).toContain("Start Your 30-Day Professional Trial");
      expect(html).toContain("No credit card required");
      expect(html).toContain("move to the Free plan after the trial");
    }
  });

  it("keeps each visible FAQ synchronized with valid FAQPage JSON-LD", () => {
    for (const data of pageData) {
      const html = renderToStaticMarkup(<ComparisonPage data={data} />);
      const serialized = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/)?.[1];
      expect(serialized).toBeTruthy();
      const schema = JSON.parse(serialized!) as { "@type": string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] };
      expect(schema["@type"]).toBe("FAQPage");
      expect(schema.mainEntity).toHaveLength(5);
      for (const [question, answer] of comparisonFaqs(data)) {
        expect(html).toContain(question);
        expect(html).toContain(answer);
        expect(schema.mainEntity).toContainEqual(expect.objectContaining({ name: question, acceptedAnswer: expect.objectContaining({ text: answer }) }));
      }
    }
  });

  it("adds all comparison pages to the sitemap and links pricing to Housecall Pro comparison", () => {
    const urls = sitemap().map((entry) => entry.url);
    for (const path of ["/vs-housecall-pro", "/vs-jobber", "/vs-junkiq"]) expect(urls).toContain(`https://junkquoteprohq.com${path}`);
    const pricing = readFileSync(resolve(process.cwd(), "src/app/pricing/page.tsx"), "utf8");
    expect(pricing).toContain('comparisonHref="/vs-housecall-pro"');
  });

  it("avoids unsupported competitor absence and savings claims", () => {
    const content = JSON.stringify(comparisonPages);
    expect(content).not.toMatch(/does not (?:have|support|include)|lacks|unavailable/i);
    expect(content).not.toContain("$1,049");
    expect(content).not.toContain("$149 +");
    expect(comparisonPages.jobber.competitorPricing).not.toMatch(/\$\d/);
    expect(comparisonPages["housecall-pro"].competitorPricing).not.toMatch(/\$\d/);
  });
});
