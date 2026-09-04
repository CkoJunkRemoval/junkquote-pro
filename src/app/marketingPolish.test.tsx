import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import About from "./about/page";
import Home from "./page";
import PricingCrewCallout from "@/components/marketing/PricingCrewCallout";
import { plans } from "@/lib/billing/config";
import { founderLinkedInUrl } from "@/lib/marketing/homepage";

describe("marketing polish", () => {
  it("compares 3-person and 10-person crews using the current Professional price", () => {
    const html = renderToStaticMarkup(
      <PricingCrewCallout monthlyCents={plans.Professional.monthlyCents} />,
    );

    expect(plans.Professional.monthlyCents).toBe(8900);
    expect(html).toContain("3-person crew");
    expect(html).toContain("10-person crew");
    expect(html.match(/\$89\/month total/g)).toHaveLength(2);
    expect(html).toContain("No per-seat fees.");
  });

  it.each([
    ["homepage", renderToStaticMarkup(<Home />)],
    ["about page", renderToStaticMarkup(<About />)],
  ])("adds the verified safe founder LinkedIn link on the %s", (_page, html) => {
    expect(html).toContain(`href="${founderLinkedInUrl}"`);
    expect(html).toContain('aria-label="Chris on LinkedIn"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
