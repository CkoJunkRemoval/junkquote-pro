import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

describe("visual refresh contrast hooks", () => {
  it("uses semantic warning and disabled-control hooks on billing", () => {
    expect(read("../../app/settings/billing/page.tsx")).toContain(
      "surface-warning",
    );
    expect(read("../../app/pricing/page.tsx")).toContain("surface-warning");
    expect(read("../../features/billing/PlanCards.tsx")).toContain(
      "control-disabled",
    );
  });

  it("uses semantic active and inactive filter hooks", () => {
    for (const source of [
      read("../../features/estimate/EstimateManagement.tsx"),
      read("../../features/invoices/InvoiceManagement.tsx"),
    ]) {
      expect(source).toContain("filter-pill");
      expect(source).toContain("filter-pill--active");
      expect(source).toContain("aria-pressed");
    }
  });
});
