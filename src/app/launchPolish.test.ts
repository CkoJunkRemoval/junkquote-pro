import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { plans } from "@/lib/billing/config";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("launch polish public and invoice UX", () => {
  const home = read("src/app/page.tsx");
  const homepageContent = `${home}\n${read("src/lib/marketing/homepage.ts")}`;
  const pricing = read("src/app/pricing/page.tsx");
  const invoice = read("src/features/invoices/InvoiceDetail.tsx");
  const estimate = read("src/features/estimate/ready/EstimateReady.tsx");
  const mutation = read("src/app/actions/invoices/invoiceMutations.ts");

  it("routes the primary trial CTA into the existing signup flow", () => {
    expect(home).toContain('href="/sign-up"');
    expect(home).toContain("Start Your 30-Day Professional Trial");
  });
  it("states the complete trial and Free fallback terms", () => {
    for (const copy of ["30-Day Professional Trial", "No Credit Card Required", "Full Professional Access", "You automatically move to the Free plan", "6 estimates per month", "No charge and no credit card required"]) expect(homepageContent).toContain(copy);
  });
  it("renders public prices from the authoritative plan catalog", () => {
    expect(plans.Free.monthlyCents).toBe(0);
    expect(plans.Free.monthlyEstimateLimit).toBe(6);
    expect(plans.Starter).toMatchObject({ monthlyCents: 3900, yearlyCents: 39000 });
    expect(plans.Professional).toMatchObject({ monthlyCents: 8900, yearlyCents: 89000 });
    expect(plans.Enterprise).toMatchObject({ monthlyCents: 14900, yearlyCents: 149000 });
    expect(pricing).toContain("monthlyCents");
    expect(pricing).toContain("yearlyCents");
    expect(pricing).toContain("A 10-person crew on Professional pays $89/month total—the same company price as a 3-person crew.");
    expect(pricing).not.toContain("Housecall Pro");
  });
  it("removes customer-facing text delivery and exposes consistent invoice actions", () => {
    expect(estimate).not.toMatch(/Send by Text|Text Invoice|SMS Invoice/i);
    for (const label of ["Send Invoice", "Copy Payment Link", "Download PDF"]) expect(invoice).toContain(label);
    expect(invoice).toContain("Payment link copied");
    expect(invoice).toContain('role="alert"');
  });
  it("authorizes and tenant-scopes protected invoice links before returning them", () => {
    const authorization = mutation.indexOf("await requireOperationalTenant()", mutation.indexOf("getInvoicePaymentLinkAction"));
    const lookup = mutation.indexOf("getInvoiceDetail(context.companyId, invoiceId)", authorization);
    expect(authorization).toBeGreaterThan(-1);
    expect(lookup).toBeGreaterThan(authorization);
    expect(mutation).toContain("customerInvoicePaymentUrl");
  });
});
