import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("customer route separation", () => {
  it("serves the tenant-guarded CRM at /customers", () => {
    const page = source("src/app/customers/page.tsx");
    expect(page).toContain('requireCompanyModulePage("customers")');
    expect(page).toContain("<CustomerManagement");
    expect(page).not.toContain("Customer stories are on the way.");
  });

  it("keeps the public placeholder separate and free of customer data access", () => {
    const page = source("src/app/customer-stories/page.tsx");
    expect(page).toContain("Customer stories are on the way.");
    expect(page).not.toMatch(/CustomerManagement|@\/lib\/customers|@\/features\/customers/);
  });
});
