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
import { AppError, safeErrorResponse } from "@/lib/errors/appError";
import { createRequestId } from "@/lib/observability/requestId";
import { checkRateLimit, ratePolicies } from "@/lib/security/rateLimit";
const reports = new Set([
  "executive",
  "revenue",
  "crew",
  "customer",
  "recurring",
  "smart-pricing",
]);
export async function GET(request: Request) {
  const requestId = createRequestId(request.headers.get("x-request-id"));
  try {
    const c = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
    if (
      !(await checkRateLimit(
        `analytics-export:${c.companyId}:${c.user.id}`,
        ratePolicies.export,
      )).allowed
    )
      throw new AppError(
        "RATE_LIMITED",
        "Too many export requests. Try again later.",
      );
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams);
    const format = raw.format ?? "csv";
    const report = (
      reports.has(raw.report) ? raw.report : "executive"
    ) as AnalyticsReport;
    const data = await getAnalyticsData(
      c.companyId,
      parseAnalyticsFilters(raw),
    );
    const rows = analyticsRows(
      data,
      report,
      analyticsAccess(c.role).showProfit,
    );
    if (format === "pdf")
      return new Response(renderAnalyticsPdf(rows, `${report} report`), {
        headers: {
          "x-request-id": requestId,
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${report}.pdf"`,
        },
      });
    if (format === "xlsx")
      return new Response(renderAnalyticsExcel(rows), {
        headers: {
          "x-request-id": requestId,
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${report}.xls"`,
        },
      });
    return new Response(renderAnalyticsCsv(rows), {
      headers: {
        "x-request-id": requestId,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report}.csv"`,
      },
    });
  } catch (error) {
    return safeErrorResponse(error, requestId);
  }
}
