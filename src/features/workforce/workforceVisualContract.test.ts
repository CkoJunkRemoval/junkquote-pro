import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("team and workforce UI contracts", () => {
  it("adds branded, mobile-safe team navigation and pages", () => {
    const sidebar = readFileSync("src/components/navigation/Sidebar.tsx", "utf8");
    const directory = readFileSync("src/app/team/page.tsx", "utf8");
    const detail = readFileSync("src/app/team/[id]/page.tsx", "utf8");
    expect(sidebar).toContain('{ label: "Team", href: "/team"');
    expect(directory).toContain("glass-card");
    expect(directory).toContain("min-h-11");
    expect(detail).toContain("overflow-x-auto");
    expect(detail).toContain("ui-button");
  });

  it("keeps compensation and restricted documents behind explicit capabilities", () => {
    const detail = readFileSync("src/app/team/[id]/page.tsx", "utf8");
    const route = readFileSync("src/app/api/private/assets/[...path]/route.ts", "utf8");
    expect(detail).toContain('"workforce.compensation.view"');
    expect(detail).toContain('["Payroll","Tax"]');
    expect(route).toContain('"workforce.documents.view"');
    expect(route).toContain('"workforce.compensation.view"');
    expect(route).toContain("workforce.document_accessed");
  });

  it("keeps browser-only tooling out of the production graph", () => {
    const config = readFileSync("tsconfig.json", "utf8");
    expect(config).not.toContain("workforce-browser-review");
  });
});

