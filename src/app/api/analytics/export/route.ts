import { requireCompanyRole } from "@/lib/auth/tenant";
import { analyticsAccess } from "@/lib/analytics/permissions";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { getAnalyticsData } from "@/lib/analytics/service";
import {
  analyticsRows,
  renderAnalyticsCsv,
  renderAnalyticsExcel,
  renderAnalyticsPdf,
  type AnalyticsReport,
} from "@/lib/analytics/export";
const reports = new Set([
  "executive",
  "revenue",
  "crew",
  "customer",
  "recurring",
  "smart-pricing",
]);
export async function GET(request: Request) {
  const c = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams);
  const format = raw.format ?? "csv";
  const report = (
    reports.has(raw.report) ? raw.report : "executive"
  ) as AnalyticsReport;
  const data = await getAnalyticsData(c.companyId, parseAnalyticsFilters(raw));
  const rows = analyticsRows(data, report, analyticsAccess(c.role).showProfit);
  if (format === "pdf")
    return new Response(renderAnalyticsPdf(rows, `${report} report`), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report}.pdf"`,
      },
    });
  if (format === "xlsx")
    return new Response(renderAnalyticsExcel(rows), {
      headers: {
        "Content-Type": "application/vnd.ms-excel",
        "Content-Disposition": `attachment; filename="${report}.xls"`,
      },
    });
  return new Response(renderAnalyticsCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${report}.csv"`,
    },
  });
}
