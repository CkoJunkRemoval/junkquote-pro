import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DashboardKpiCards, {
  dashboardKpiRoutes,
  type DashboardKpiCounts,
} from "./DashboardKpiCards";

const counts: DashboardKpiCounts = {
  draftEstimates: 3,
  awaitingApproval: 4,
  approved: 5,
  scheduled: 6,
  inProgress: 7,
  completedToday: 8,
  invoicesAwaitingPayment: 9,
  paidThisMonth: 10,
};

describe("dashboard KPI cards", () => {
  it("routes every card to its authoritative filtered section", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    for (const href of Object.values(dashboardKpiRoutes)) {
      expect(html).toContain(`href="${href.replace("&", "&amp;")}"`);
    }
    expect(html.match(/<a /g)).toHaveLength(8);
  });

  it("uses links as native click and keyboard actions", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    expect(html).toContain('aria-label="Draft Estimates: 3. Open filtered view."');
    expect(html).toContain("focus-visible:ring-2");
    expect(html).toContain("cursor-pointer");
    expect(html).toContain("transition-");
  });

  it("uses two equal-width cards per mobile row without overflow", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    expect(html).toContain("grid grid-cols-1");
    expect(html).toContain("min-[360px]:grid-cols-2");
    expect(html).toContain("lg:grid-cols-3");
    expect(html).toContain("lg:grid-cols-2");
    expect(html).toContain("min-h-32 min-w-0");
    expect(html).not.toContain("overflow-x");
  });

  it("renders compact zero-value cards without an empty placeholder", () => {
    const zeroCounts = Object.fromEntries(
      Object.keys(counts).map((key) => [key, 0]),
    ) as DashboardKpiCounts;
    const html = renderToStaticMarkup(
      <DashboardKpiCards counts={zeroCounts} />,
    );
    expect(html.match(/>0<\/p>/g)).toHaveLength(8);
    expect(html).toContain("p-3");
  });

  it("provides a named KPI region and hides decorative icons", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    expect(html).toContain(
      'aria-label="Dashboard key performance indicators"',
    );
    expect(html.match(/aria-hidden="true"/g)).toHaveLength(16);
  });

  it("renders every icon, label, group, and open cue consistently", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    for (const label of ["Draft Estimates","Awaiting Approval","Approved","Scheduled","In Progress","Completed Today","Invoices Awaiting Payment","Paid This Month"]) {
      expect(html).toContain(label);
    }
    for (const group of ["Estimate Pipeline","Operations","Financial"]) {
      expect(html).toContain(group);
    }
    expect(html.match(/lucide-arrow-up-right/g)).toHaveLength(8);
    expect(html.match(/min-h-10/g)).toHaveLength(8);
  });

  it("uses permission-safe operational routes", () => {
    for (const href of Object.values(dashboardKpiRoutes)) {
      expect(href).toMatch(/^\/(estimates|jobs|invoices)\?/);
      expect(href).not.toContain("/admin");
      expect(href).not.toContain("companyId");
    }
  });

  it("uses contrast tokens and respects reduced motion", () => {
    const html = renderToStaticMarkup(<DashboardKpiCards counts={counts} />);
    expect(html).toContain("bg-[var(--surface)]");
    expect(html).toContain("text-[var(--surface-foreground)]");
    expect(html).toContain("border-[var(--border-color)]");
    expect(html).toContain("motion-reduce:transition-none");
    expect(html).toContain("motion-reduce:transform-none");
  });
});
