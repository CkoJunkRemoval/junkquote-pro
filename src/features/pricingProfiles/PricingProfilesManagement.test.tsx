import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/pricingProfiles/pricingProfiles", () => ({}));
import PricingProfilesManagement from "./PricingProfilesManagement";

const profile = {
  id: "profile-1", companyId: "company-1", name: "Residential", description: "Homes",
  active: true, defaultProfile: true, minimumCharge: 175, tripFee: 25, laborRate: 85,
  dumpFee: 40, mileageRate: 1.5, fuelSurcharge: 10, defaultCrewSize: 2,
  taxEnabled: true, taxRate: 8.25, currency: "USD", displayOrder: 0,
  createdAt: new Date(), updatedAt: new Date(), _count: { estimates: 3 },
};

describe("PricingProfilesManagement", () => {
  it("renders desktop table and mobile cards with the required profile details", () => {
    const html = renderToStaticMarkup(<PricingProfilesManagement initialProfiles={[profile]} canManage />);
    expect(html).toContain("hidden overflow-visible");
    expect(html).toContain("md:hidden");
    expect(html).toContain("Residential");
    expect(html).toContain("Minimum charge");
    expect(html).toContain("Labor rate");
    expect(html).toContain("Default");
    expect(html).toContain("Actions for Residential");
    expect(html).toContain("min-h-11");
  });

  it("is read-only for crew and omits management actions", () => {
    const html = renderToStaticMarkup(<PricingProfilesManagement initialProfiles={[profile]} canManage={false} />);
    expect(html).toContain("read only for your role");
    expect(html).not.toContain("New Profile");
    expect(html).not.toContain("Actions for Residential");
  });
});
