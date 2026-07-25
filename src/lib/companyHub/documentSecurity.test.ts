import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("company document security gate", () => {
  it("keeps upload disabled until tenant-authorized delivery exists", () => {
    const action = readFileSync(
      "src/app/actions/company/hub.ts",
      "utf8",
    );
    const page = readFileSync(
      "src/app/settings/company/documents/page.tsx",
      "utf8",
    );
    expect(action).toContain(
      "uploads are disabled until authenticated tenant-authorized delivery",
    );
    expect(page).toContain("Upload unavailable");
    expect(page).toContain("Document listing is unavailable");
    expect(page).toContain("disabled");
    expect(page).not.toContain("objectKey");
    expect(page).not.toContain("company.companyDocuments.map");
  });
});
