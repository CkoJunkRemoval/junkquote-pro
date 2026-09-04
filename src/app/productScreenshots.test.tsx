import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "@/auth.config";
import { productScreenshots } from "@/lib/marketing/productScreenshots";
import About from "./about/page";
import Features from "./features/page";
import Home from "./page";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("real product screenshot marketing story", () => {
  const home = renderToStaticMarkup(<Home />);
  const features = renderToStaticMarkup(<Features />);

  it("renders the three production screenshots in Build, Approve, Run order", () => {
    expect(home).toContain("See JunkQuote Pro in action");
    const stages = [
      ["01 — BUILD THE QUOTE", productScreenshots.estimate],
      ["02 — GET APPROVAL", productScreenshots.approval],
      ["03 — RUN THE JOB", productScreenshots.dispatch],
    ] as const;
    let previous = -1;
    for (const [label, image] of stages) {
      const index = home.indexOf(label);
      expect(index).toBeGreaterThan(previous);
      expect(home).toContain(encodeURIComponent(image.src));
      expect(home).toContain(`alt="${image.alt}"`);
      previous = index;
    }
  });

  it("reuses the same three production assets on the features page", () => {
    for (const image of Object.values(productScreenshots)) expect(features).toContain(encodeURIComponent(image.src));
    expect(features).toContain("Quote the Job: itemized estimate review");
    expect(features).toContain("Customer approval and delivery options");
    expect(features).toContain("Run the Job: scheduling, crew assignment");
  });

  it("creates only the three required production screenshot files", () => {
    expect(readdirSync(resolve(process.cwd(), "public/branding/product")).sort()).toEqual([
      "dispatch-board.png",
      "estimate-approval.png",
      "estimate-review.png",
    ]);
  });

  it("preserves founder, pricing route, public comparison, and schema contracts", () => {
    const about = renderToStaticMarkup(<About />);
    expect(home).not.toContain("Chris on LinkedIn");
    expect(about).toContain("https://www.linkedin.com/in/chris-ostrander-94837b432/");
    expect(about).toContain('aria-label="Chris on LinkedIn"');
    expect(home).toContain('aria-label="Pricing and software comparisons"');
    expect(home.match(/href="\/compare"/g)).toHaveLength(2);
    expect(home).toContain("<span>View Pricing &amp; Compare</span>");
    expect(isPublicAuthPath("/compare")).toBe(true);
    const pricing = read("src/app/pricing/page.tsx");
    expect(pricing).toContain("<PlanCards");
    expect(pricing).toContain('redirect("/compare")');
    expect(home).toContain('type="application/ld+json"');
    for (const type of ["Organization", "SoftwareApplication", "FAQPage"]) expect(read("src/lib/marketing/homepage.ts")).toContain(type);
  });

  it("does not reference estimate or item-pricing implementations", () => {
    for (const path of ["src/app/page.tsx", "src/app/features/page.tsx", "src/components/marketing/ProductWorkflowStory.tsx", "src/components/marketing/ProductScreenshot.tsx"]) {
      expect(read(path)).not.toMatch(/calculateEstimate|livePricingBreakdown|pricingProfiles|pricingRules|disposalCalculations/);
    }
  });
});
