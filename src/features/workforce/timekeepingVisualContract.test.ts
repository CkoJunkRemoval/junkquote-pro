import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(path, "utf8");

describe("timekeeping visual and production contracts", () => {
  it("exposes the four timekeeping destinations in branded navigation", () => {
    const sidebar = source("src/components/navigation/Sidebar.tsx");
    for (const label of [
      "My Time",
      "Team Timesheets",
      "Pay Periods",
      "Time Exceptions",
    ])
      expect(sidebar).toContain(label);
  });

  it("uses responsive dark surfaces and 44px controls", () => {
    const pages = [
      "src/app/team/time/page.tsx",
      "src/app/team/timesheets/page.tsx",
      "src/app/team/pay-periods/page.tsx",
      "src/app/team/time-exceptions/page.tsx",
    ].map(source);
    for (const page of pages) {
      expect(page).toContain("glass-card");
      expect(page).toMatch(/sm:|lg:/);
    }
    expect(pages.join("\n")).toContain("min-h-11");
    expect(pages.join("\n")).toContain("ui-button--primary");
  });

  it("keeps browser automation out of the production graph", () => {
    const config = source("tsconfig.json");
    const production = [
      ...[
        "src/app/team/time/page.tsx",
        "src/app/team/timesheets/page.tsx",
        "src/app/team/pay-periods/page.tsx",
        "src/app/team/time-exceptions/page.tsx",
      ].map(source),
      source("src/lib/timekeeping/service.ts"),
    ].join("\n");
    expect(production).not.toContain("playwright");
    expect(config).not.toContain("timekeeping-browser-review");
  });
});
