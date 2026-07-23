import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  CompanyLogo,
  companyLogoRequestUrl,
  nextCompanyLogoState,
} from "./CompanyLogo";

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
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain("invisible");
  });
  it("retries one transient failure once and only then exposes the fallback", () => {
    const initial = {
      src: "/api/private/assets/company-logos/t/logo.png",
      attempt: 0 as const,
      loaded: false,
      failed: false,
    };
    const retry = nextCompanyLogoState(initial, "failed");
    expect(retry).toMatchObject({ attempt: 1, failed: false });
    expect(companyLogoRequestUrl(initial.src, retry.attempt)).toContain(
      "logoRetry=1",
    );
    expect(nextCompanyLogoState(retry, "failed")).toMatchObject({
      attempt: 1,
      failed: true,
    });
  });
  it("marks a valid image loaded without showing initials", () => {
    expect(
      nextCompanyLogoState(
        { src: "/logo", attempt: 0, loaded: false, failed: false },
        "loaded",
      ),
    ).toMatchObject({ loaded: true, failed: false });
  });
});
