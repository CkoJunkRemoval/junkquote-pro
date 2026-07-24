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

  it("scopes shared control variants to estimate, invoice, job, and pricing screens", () => {
    for (const source of [
      read("../../app/estimates/[id]/page.tsx"),
      read("../../app/invoices/[id]/page.tsx"),
      read("../../app/pricing/page.tsx"),
      read("../../features/estimate/EstimateManagement.tsx"),
      read("../../features/invoices/InvoiceManagement.tsx"),
      read("../../features/jobs/JobDetail.tsx"),
    ]) {
      expect(source).toContain("contrast-controls");
    }
  });

  it("provides readable shared secondary, disabled, destructive, warning, and status states", () => {
    const styles = read("../../app/globals.css");
    expect(styles).toContain(".contrast-controls :where(button)");
    expect(styles).toContain(".contrast-controls :where(button):disabled");
    expect(styles).toContain(".contrast-controls button.text-red-700");
    expect(styles).toContain(".contrast-controls button.text-amber-800");
    expect(styles).toContain(".control-secondary");
    expect(styles).toContain(".status-chip");
    expect(read("../../features/invoices/InvoiceDetail.tsx")).toContain(
      'status === "Void" ? "text-red-700"',
    );
    expect(read("../../features/invoices/InvoiceDetail.tsx")).toContain(
      'status === "Overdue" ? "text-amber-800"',
    );
    expect(read("../../features/jobs/JobDetail.tsx")).toContain(
      'status === "Cancelled" ? "text-red-700"',
    );
  });
});
