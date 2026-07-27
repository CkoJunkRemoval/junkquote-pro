import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("platform administration privacy and visual contract", () => {
  const service = readFileSync("src/lib/admin/platformAnalytics.ts", "utf8");
  const detail = readFileSync("src/app/platform-admin/companies/[id]/page.tsx", "utf8");
  const shell = readFileSync("src/features/platformAdmin/PlatformAdminShell.tsx", "utf8");
  const route = readFileSync("src/app/api/platform-admin/exports/[kind]/route.ts", "utf8");
  it("does not query sensitive content authorities", () => {
    for (const forbidden of ["customerNote", "passwordHash", "taxDocument", "workforceCompensation", "workforceDocument", "companyDocument", "financeDocument"])
      expect(service).not.toContain(forbidden);
    expect(detail).not.toMatch(/impersonat(e|ion)Action|customer note|compensation|tax document/i);
  });
  it("enforces platform authorization on pages and exports", () => {
    expect(route).toContain("requirePlatformAdmin");
    expect(route).toContain("platform_admin.export_");
    expect(route).toContain("private, no-store");
  });
  it("has mobile-safe accessible chart and navigation contracts", () => {
    expect(shell).toContain("overflow-x-hidden");
    expect(shell).toContain("min-h-11");
    expect(shell).toContain('role="img"');
    expect(shell).toContain("aria-label");
  });
});
