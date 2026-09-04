import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "./page";
import { homepageFaqs, homepageStructuredData } from "@/lib/marketing/homepage";
import { siteUrl } from "@/lib/marketing/metadata";

describe("homepage quick wins", () => {
  it("renders the requested underpricing outcome", () => {
    const html = renderToStaticMarkup(<Home />);
    expect(html).toContain("Stop underpricing jobs you quoted over the phone.");
    expect(html).toContain("Build estimates from consistent pricing so the crew arrives to a job that matches the quote.");
  });

  it("serializes one FAQPage from the same four visible questions and answers", () => {
    const structuredData = homepageStructuredData(siteUrl);
    const parsed = JSON.parse(JSON.stringify(structuredData)) as typeof structuredData;
    const faqPage = parsed["@graph"].find((entry) => entry["@type"] === "FAQPage");
    const entities = faqPage && "mainEntity" in faqPage ? faqPage.mainEntity : [];
    const html = renderToStaticMarkup(<Home />);

    expect(html).toContain('"@type":"FAQPage"');
    expect(entities).toHaveLength(4);
    for (const [question, answer] of homepageFaqs) {
      expect(html).toContain(question);
      expect(html).toContain(answer);
      expect(entities).toContainEqual({
        "@type": "Question",
        name: question,
        acceptedAnswer: { "@type": "Answer", text: answer },
      });
    }
  });
});
