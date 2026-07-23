import { describe, expect, it } from "vitest";
import {
  buildCompanyLogoStoragePrefix,
  companyLogoPathToKey,
  normalizeCompanyLogoPath,
} from "./companyLogoStorage";

describe("company logo storage ownership", () => {
  it("builds tenant-owned private paths", () =>
    expect(buildCompanyLogoStoragePrefix("tenant-a")).toBe(
      "/api/private/assets/company-logos/tenant-a/",
    ));
  it("keeps valid stable paths and derives the private object key", () => {
    const path = "/api/private/assets/company-logos/tenant-a/logo.png";
    expect(normalizeCompanyLogoPath("tenant-a", path)).toBe(path);
    expect(companyLogoPathToKey(path)).toBe("company-logos/tenant-a/logo.png");
  });
  it("normalizes legacy local and Supabase full URLs without retaining signed tokens", () => {
    const expected = "/api/private/assets/company-logos/tenant-a/logo.png";
    expect(
      normalizeCompanyLogoPath(
        "tenant-a",
        "/uploads/company-logos/tenant-a/logo.png",
      ),
    ).toBe(expected);
    expect(
      normalizeCompanyLogoPath(
        "tenant-a",
        "https://project.supabase.co/storage/v1/object/sign/private-assets/company-logos/tenant-a/logo.png?token=expired",
      ),
    ).toBe(expected);
  });
  it("rejects cross-tenant and malformed legacy paths", () => {
    expect(
      normalizeCompanyLogoPath(
        "tenant-a",
        "/uploads/company-logos/tenant-b/logo.png",
      ),
    ).toBeNull();
    expect(
      normalizeCompanyLogoPath("tenant-a", "javascript:alert(1)"),
    ).toBeNull();
    expect(() => buildCompanyLogoStoragePrefix("../tenant-b")).toThrow(
      "Invalid company ID",
    );
  });
});
