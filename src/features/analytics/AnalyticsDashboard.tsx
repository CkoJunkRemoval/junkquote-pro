import Link from "next/link";
import type {
  getAnalyticsData,
  getAnalyticsFilterOptions,
} from "@/lib/analytics/service";
import type { AnalyticsFilters } from "@/lib/analytics/filters";
import { filtersToQuery } from "@/lib/analytics/filters";
type Data = Awaited<ReturnType<typeof getAnalyticsData>>;
type Options = Awaited<ReturnType<typeof getAnalyticsFilterOptions>>;
const money = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const number = (n: number) =>
  new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
const pct = (n: number) => `${number(n)}%`;
export default function AnalyticsDashboard({
  data,
  options,
  filters,
  showProfit,
}: {
  data: Data;
  options: Options;
  filters: AnalyticsFilters;
  showProfit: boolean;
}) {
  const q = filtersToQuery(filters);
  return (
    <div className="mx-auto max-w-[1500px] p-5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
            Business intelligence
          </p>
          <h1 className="text-3xl font-bold">Executive Dashboard</h1>
          <p className="text-slate-600">
            {filters.from.toLocaleDateString()} –{" "}
            {filters.to.toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            "executive",
            "revenue",
            "crew",
            "customer",
            "recurring",
            "smart-pricing",
          ].map((r) => (
            <span className="inline-flex rounded-lg border bg-white" key={r}>
              {["csv", "xlsx", "pdf"].map((f) => (
                <Link
                  className="px-2 py-2 text-xs uppercase"
                  href={`/api/analytics/export?${q}&report=${r}&format=${f}`}
                  key={f}
                >
                  {r.replace("-", " ")} {f}
                </Link>
              ))}
            </span>
          ))}
        </div>
      </div>
      <Filters options={options} filters={filters} />
      {data.meta.truncated && (
        <p className="mt-3 rounded-lg bg-amber-100 p-3 text-amber-900">
          This result reached the 10,000-record safety cap. Narrow the date
          range for exact detail.
        </p>
      )}
      <Section title="Revenue">
        <Cards
          rows={[
            ["Today", money(data.revenue.periods.today)],
            ["Week", money(data.revenue.periods.week)],
            ["Month", money(data.revenue.periods.month)],
            ["Quarter", money(data.revenue.periods.quarter)],
            ["Year", money(data.revenue.periods.year)],
          ]}
        />
        <Cards
          rows={[
            ["Gross revenue", money(data.revenue.grossRevenue)],
            ["Collected revenue", money(data.revenue.collectedRevenue)],
            ["Outstanding invoices", money(data.revenue.outstandingInvoices)],
            ["Refunds", money(data.revenue.refundTotal)],
            ["Average invoice", money(data.revenue.averageInvoice)],
            ["Revenue growth", pct(data.revenue.growth)],
          ]}
        />
        <Bars rows={data.revenue.byCategory} />
      </Section>
      <Section title="Sales">
        <Cards
          rows={[
            ["Estimates created", data.sales.created],
            ["Approval rate", pct(data.sales.approvalRate)],
            ["Decline rate", pct(data.sales.declineRate)],
            ["Pending approvals", data.sales.pending],
            ["Average quote", money(data.sales.averageQuote)],
            ["Accepted quote", money(data.sales.averageAcceptedQuote)],
            ["Conversion rate", pct(data.sales.conversionRate)],
            ["Estimate revenue", money(data.sales.revenueFromEstimates)],
          ]}
        />
        <Table
          headers={["Estimator", "Estimates", "Approval", "Revenue"]}
          rows={data.sales.estimators.map((x) => [
            x.name,
            x.estimates,
            pct(x.approvalRate),
            money(x.revenue),
          ])}
        />
      </Section>
      <Section title="Operations">
        <Cards
          rows={[
            ["Jobs completed", data.operations.completed],
            ["Jobs cancelled", data.operations.cancelled],
            [
              "Average duration",
              `${number(data.operations.averageDurationHours)} hr`,
            ],
            [
              "Completion delay",
              `${number(data.operations.averageCompletionDelayHours)} hr`,
            ],
            ["Recurring jobs", data.operations.recurringJobs],
            ["Crew utilization", pct(data.operations.crewUtilization)],
            ["Capacity utilization", pct(data.operations.capacityUtilization)],
          ]}
        />
      </Section>
      <Section title="Customers">
        <Cards
          rows={[
            ["New customers", data.customers.newCustomers],
            ["Returning customers", data.customers.returningCustomers],
            ["Repeat-job rate", pct(data.customers.repeatJobRate)],
            ["Lifetime value", money(data.customers.lifetimeValue)],
            ["Customer retention", pct(data.customers.retentionRate)],
            ["Active plans", data.customers.activePlans],
            [
              "Revenue/customer",
              money(data.customers.averageRevenuePerCustomer),
            ],
          ]}
        />
      </Section>
      <Section title="Recurring Services">
        <Cards
          rows={[
            ["Active service plans", data.customers.activePlans],
            ["Recurring jobs", data.operations.recurringJobs],
            [
              "Recurring share",
              pct(
                data.operations.completed
                  ? (data.operations.recurringJobs /
                      data.operations.completed) *
                      100
                  : 0,
              ),
            ],
          ]}
        />
      </Section>
      <Section title="Crew Performance">
        <Table
          headers={[
            "Crew",
            "Jobs",
            "Revenue",
            "Estimated hours",
            "Actual hours",
            "Capacity",
            "Idle",
            "Overlaps",
          ]}
          rows={data.crews.map((x) => [
            x.name,
            x.jobs,
            money(x.revenue),
            number(x.estimatedHours),
            number(x.actualHours),
            pct(x.capacityUsage),
            pct(x.idlePercentage),
            x.overlaps,
          ])}
        />
      </Section>
      <Section title="Smart Pricing">
        <Cards
          rows={[
            ["Acceptance rate", pct(data.smartPricing.acceptanceRate)],
            ["Underbid rate", pct(data.smartPricing.underbidRate)],
            ["Overbid rate", pct(data.smartPricing.overbidRate)],
            ["Estimate accuracy", pct(data.smartPricing.estimateAccuracy)],
            ...(showProfit
              ? [
                  ["Gross margin", pct(data.smartPricing.grossMargin)] as [
                    string,
                    string,
                  ],
                ]
              : []),
          ]}
        />
        <Bars rows={data.smartPricing.confidenceDistribution} />
        {showProfit && (
          <Bars
            rows={data.smartPricing.profitabilityByCategory.map((row) => ({
              label: row.label,
              value: row.profit,
            }))}
          />
        )}
        <Table
          headers={["Month", "Quoted", "Collected"]}
          rows={data.smartPricing.historicalTrend.map((row) => [
            row.label,
            money(row.quoted),
            money(row.collected),
          ])}
        />
      </Section>
      <Section title="Financial Health">
        <Cards
          rows={[
            ["Accounts receivable", money(data.financial.accountsReceivable)],
            ["Collection rate", pct(data.financial.collectionRate)],
            ["Current", money(data.financial.aging.current)],
            ["1–30 days", money(data.financial.aging.days30)],
            ["31–60 days", money(data.financial.aging.days60)],
            ["61+ days", money(data.financial.aging.days90Plus)],
          ]}
        />
        <Bars rows={data.financial.paymentMethods} />
        <Bars rows={data.financial.cashFlowTrend} />
      </Section>
    </div>
  );
}
function Filters({
  options,
  filters,
}: {
  options: Options;
  filters: AnalyticsFilters;
}) {
  return (
    <form className="mt-6 grid gap-3 rounded-xl border bg-white p-4 md:grid-cols-4 xl:grid-cols-8">
      <input
        name="from"
        type="date"
        defaultValue={filters.from.toISOString().slice(0, 10)}
        className="rounded border p-2"
      />
      <input
        name="to"
        type="date"
        defaultValue={filters.to.toISOString().slice(0, 10)}
        className="rounded border p-2"
      />
      <Select
        name="estimator"
        value={filters.estimatorId}
        label="All estimators"
        rows={options.estimators.map((x) => ({
          id: x.id,
          label: [x.firstName, x.lastName].filter(Boolean).join(" ") || x.email,
        }))}
      />
      <Select
        name="crew"
        value={filters.crewId}
        label="All crews"
        rows={options.crews.map((x) => ({ id: x.id, label: x.name }))}
      />
      <Select
        name="customer"
        value={filters.customerId}
        label="All customers"
        rows={options.customers.map((x) => ({
          id: x.id,
          label: `${x.firstName} ${x.lastName}`,
        }))}
      />
      <Select
        name="category"
        value={filters.category}
        label="All categories"
        rows={options.categories.map((x) => ({ id: x, label: x }))}
      />
      <label className="flex items-center gap-2">
        <input
          name="recurring"
          value="1"
          type="checkbox"
          defaultChecked={filters.recurringOnly}
        />
        Recurring only
      </label>
      <label className="flex items-center gap-2">
        <input
          name="completed"
          value="1"
          type="checkbox"
          defaultChecked={filters.completedOnly}
        />
        Completed only
      </label>
      <button className="rounded bg-slate-900 px-4 py-2 text-white">
        Apply
      </button>
      <Link href="/analytics" className="rounded border px-4 py-2 text-center">
        Reset
      </Link>
    </form>
  );
}
function Select({
  name,
  value,
  label,
  rows,
}: {
  name: string;
  value?: string;
  label: string;
  rows: { id: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value ?? ""}
      className="rounded border p-2"
    >
      <option value="">{label}</option>
      {rows.map((x) => (
        <option value={x.id} key={x.id}>
          {x.label}
        </option>
      ))}
    </select>
  );
}
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="mt-3 space-y-4">{children}</div>
    </section>
  );
}
function Cards({ rows }: { rows: [string, string | number][] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {rows.map(([l, v]) => (
        <article className="rounded-xl border bg-white p-4" key={l}>
          <p className="text-xs uppercase text-slate-500">{l}</p>
          <p className="mt-1 text-2xl font-bold">{v}</p>
        </article>
      ))}
    </div>
  );
}
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((x) => x.value));
  return (
    <div className="rounded-xl border bg-white p-4">
      {rows.slice(0, 12).map((x) => (
        <div
          className="mb-2 grid grid-cols-[140px_1fr_90px] items-center gap-2"
          key={x.label}
        >
          <span className="truncate text-sm">{x.label}</span>
          <span className="h-2 rounded bg-slate-100">
            <span
              className="block h-2 rounded bg-blue-600"
              style={{ width: `${Math.max(2, (x.value / max) * 100)}%` }}
            />
          </span>
          <span className="text-right text-sm">{number(x.value)}</span>
        </div>
      ))}
      {!rows.length && (
        <p className="text-slate-500">No data for this period.</p>
      )}
    </div>
  );
}
function Table({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((x) => (
              <th className="p-3 text-left" key={x}>
                {x}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr className="border-t" key={i}>
              {r.map((x, j) => (
                <td className="p-3" key={j}>
                  {x}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && (
        <p className="p-4 text-slate-500">No data for this period.</p>
      )}
    </div>
  );
}
