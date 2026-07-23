import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CompanyLogo } from "./CompanyLogo";

describe("CompanyLogo", () => {
  it("renders a visible fallback when no logo exists", () => {
    const markup = renderToStaticMarkup(
      <CompanyLogo src={null} companyName="Acme Hauling" size={32} />,
    );
    expect(markup).toContain("AH");
    expect(markup).not.toContain("<img");
  });
  it("uses the stable authenticated asset path directly instead of Next image optimization", () => {
    const path = "/api/private/assets/company-logos/tenant-a/logo.png";
    const markup = renderToStaticMarkup(
      <CompanyLogo src={path} companyName="Acme" size={32} />,
    );
    expect(markup).toContain(`src="${path}"`);
    expect(markup).not.toContain("/_next/image");
    expect(markup).toContain("Acme logo");
  });
});
