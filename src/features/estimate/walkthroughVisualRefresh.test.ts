import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("estimate walkthrough visual refresh", () => {
  it("keeps every internal walkthrough screen inside the branded theme boundary", () => {
    const wizard = source("src/features/estimate/NewEstimate.tsx");

    expect(wizard).toContain("estimate-walkthrough-theme");
    expect(wizard).toContain("<CustomerStep />");
    expect(wizard).toContain("<PropertyStep />");
    expect(wizard).toContain("<JobSiteStep />");
    expect(wizard).toContain("<ItemsStep />");
    expect(wizard).toContain("<ReviewEstimate />");
    expect(wizard).toContain("<EstimateReady />");
  });

  it("covers item, photo, notes, and area navigation panels", () => {
    const walkthrough = source("src/features/estimate/walkthrough/Walkthrough.tsx");

    expect(walkthrough).toContain("<PhotoPanel />");
    expect(walkthrough).toContain("<ItemGrid");
    expect(walkthrough).toContain("<NotesPanel />");
    expect(walkthrough).toContain("<AreaSummary");
    expect(walkthrough).toContain("<AreaNavigator");
  });

  it("provides explicit shared button variants for primary and semantic actions", () => {
    const button = source("src/components/ui/Button.tsx");
    const wizard = source("src/features/estimate/NewEstimate.tsx");
    const approval = source("src/features/estimate/ready/EstimateReady.tsx");

    expect(button).toContain('"primary" | "secondary" | "danger" | "warning"');
    expect(button).toContain("ui-button--${variant}");
    expect(wizard).toContain('variant="secondary"');
    expect(wizard).toContain('variant="danger"');
    expect(approval).toContain('<Button type="button" variant="secondary"');
  });

  it("defines dark form, selection, semantic, focus, disabled, and touch styling", () => {
    const css = source("src/app/globals.css");

    expect(css).toContain(".estimate-walkthrough-theme :where(input, select, textarea)");
    expect(css).toContain(".estimate-walkthrough-theme :where(.bg-blue-50, .bg-blue-100)");
    expect(css).toContain(".estimate-walkthrough-theme :where(.bg-green-50, .bg-green-100)");
    expect(css).toContain(".estimate-walkthrough-theme :where(.bg-amber-50, .bg-yellow-50)");
    expect(css).toContain(".estimate-walkthrough-theme :where(button:not(.ui-button)):disabled");
    expect(css).toContain("accent-color: var(--brand-orange)");
    expect(css).toContain("min-height: 2.75rem");
    expect(css).toContain(":focus-visible");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
