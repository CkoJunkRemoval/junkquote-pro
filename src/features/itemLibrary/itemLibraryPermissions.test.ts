import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Item Library permissions and responsive UI", () => {
  const actions = readFileSync("src/app/actions/itemLibrary/itemLibrary.ts", "utf8");
  const page = readFileSync("src/app/settings/item-library/page.tsx", "utf8");
  const ui = readFileSync("src/features/itemLibrary/ItemLibraryManagement.tsx", "utf8");
  it("restricts management while retaining tenant-scoped crew reads", () => {
    expect(actions).toContain('requireCompanyRole("Owner", "Admin", "Office")');
    expect(actions).toContain("requireTenantContext()");
    expect(actions).not.toContain('requireCompanyRole("Crew"');
    expect(page).toContain('["Owner", "Admin", "Office"].includes(context.role)');
  });
  it("contains separate desktop and mobile layouts, pagination, lazy server search, and 44px controls", () => {
    expect(ui).toContain("md:block");
    expect(ui).toContain("md:hidden");
    expect(ui).toContain("min-h-11");
    expect(ui).toContain("listItemLibraryAction");
    expect(ui).toContain("Page {data.page}");
  });
});
