import AppLayout from "@/components/layout/AppLayout";
import AnalyticsDashboard from "@/features/analytics/AnalyticsDashboard";
import { requireCompanyRole } from "@/lib/auth/tenant";
import { parseAnalyticsFilters } from "@/lib/analytics/filters";
import { analyticsAccess } from "@/lib/analytics/permissions";
import {
  getAnalyticsData,
  getAnalyticsFilterOptions,
} from "@/lib/analytics/service";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const c = await requireCompanyRole("Owner", "Admin", "Manager", "Office");
  const filters = parseAnalyticsFilters(await searchParams);
  const [data, options] = await Promise.all([
    getAnalyticsData(c.companyId, filters),
    getAnalyticsFilterOptions(c.companyId),
  ]);
  return (
    <AppLayout>
      <AnalyticsDashboard
        data={data}
        options={options}
        filters={filters}
        showProfit={analyticsAccess(c.role).showProfit}
      />
    </AppLayout>
  );
}
