import { describe, expect, it } from "vitest";
import { buildCompanyLogoStoragePrefix } from "./companyLogoStorage";

describe("company logo storage ownership", () => {
  it("builds tenant-owned private paths", () => expect(buildCompanyLogoStoragePrefix("tenant-a")).toBe("/api/private/assets/company-logos/tenant-a/"));
  it("rejects traversal-shaped company IDs", () => expect(() => buildCompanyLogoStoragePrefix("../tenant-b")).toThrow("Invalid company ID"));
});
