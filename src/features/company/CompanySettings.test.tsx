import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/company/branding", () => ({
  removeCompanyLogoAction: vi.fn(),
  updateCompanyBrandingAction: vi.fn(),
  uploadCompanyLogoAction: vi.fn(),
}));

import CompanySettings from "./CompanySettings";

const initialCompany = {
  id: "company-1",
  name: "Junk Team LLC",
  legalName: "Junk Team LLC",
  displayName: "Junk Team",
  email: "team@example.com",
  phone: null,
  website: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  postalCode: null,
  logoUrl: null,
  primaryColor: "#2563eb",
  secondaryColor: "#0f172a",
  invoicePrefix: "INV",
  estimatePrefix: "EST",
  defaultTaxRate: 0,
  defaultPaymentTermsDays: 30,
  defaultEstimateExpirationDays: 30,
  defaultMinimumCharge: 0,
  timezone: "America/New_York",
  currencyCode: "USD",
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("company settings branding", () => {
  it("renders LogoUploadControl instead of the visible browser file input", () => {
    const html = renderToStaticMarkup(
      <CompanySettings initialCompany={initialCompany} />,
    );

    expect(html).toContain('data-testid="logo-upload-control"');
    expect(html).toContain("Choose logo");
    expect(html.match(/type="file"/g)).toHaveLength(1);
    expect(html).toMatch(
      /data-testid="company-logo-file" class="sr-only" type="file"/,
    );
    expect(html).not.toContain("Choose File");
    expect(html).not.toContain("No file chosen");
  });
});
