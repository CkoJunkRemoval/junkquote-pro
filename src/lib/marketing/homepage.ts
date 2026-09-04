export const homepageFaqs = [
  ["Is JunkQuote Pro built specifically for junk removal?", "Yes. Every feature — estimating, scheduling, dispatch, invoicing, and payments — is designed for junk removal operators, not adapted from HVAC or plumbing."],
  ["What happens after my 30-day trial?", "You automatically move to the Free plan with 6 estimates per month. No charge and no credit card required."],
  ["Does it integrate with QuickBooks?", "JunkQuote Pro provides QuickBooks-ready payment exports. Direct QuickBooks synchronization is not currently available."],
  ["How is pricing structured?", "Per company, not per seat. A 10-person crew pays the same as a 3-person crew."],
] as const;

export function homepageStructuredData(siteUrl: URL) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${siteUrl}#organization`,
        name: "JunkQuote Pro",
        url: siteUrl.toString(),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${siteUrl}#software`,
        name: "JunkQuote Pro",
        url: siteUrl.toString(),
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        description: "Estimating and job management software built for junk removal businesses.",
        audience: { "@type": "BusinessAudience", audienceType: "Junk removal businesses" },
        provider: { "@id": `${siteUrl}#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${siteUrl}#faq`,
        mainEntity: homepageFaqs.map(([question, answer]) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}
