import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
describe("detail page authorization boundaries", () => {
  it.each([
    ["invoice", "src/app/invoices/[id]/page.tsx", "invoices"],
    ["customer", "src/app/customers/[id]/page.tsx", "customers"],
    ["job", "src/app/jobs/[id]/page.tsx", "jobs"],
  ])("uses the controlled module boundary for %s detail", (_label, path, module) => {
    const source = read(path);
    expect(source).toContain(`requireCompanyModulePage("${module}")`);
    expect(source).not.toMatch(/requireOperationalTenant|requireCompanyRole/);
  });
  it("keeps invoice lookup tenant-scoped", () => {
    expect(read("src/app/invoices/[id]/page.tsx")).toContain("getInvoiceDetail(companyId, id)");
  });
  it.each(["invoices", "customers", "jobs"])("reuses the branded denial in the %s segment", segment => {
    const source = read(`src/app/${segment}/forbidden.tsx`);
    expect(source).toContain("<AccessDenied />");
    expect(source).toContain("<AppLayout>");
  });
});
