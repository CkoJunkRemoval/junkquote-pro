export type AnalyticsInvoice = {
  id: string;
  customerId: string;
  total: number;
  balanceDue: number;
  status: string;
  createdAt: Date;
  issuedDate: Date | null;
  dueDate: Date | null;
  estimateId: string;
  jobId: string | null;
};
export type AnalyticsPayment = {
  amount: number;
  method: string;
  paymentDate: Date;
  refunds: { amount: number; refundedAt: Date }[];
  invoice: { customerId: string; jobId: string | null };
};
export type AnalyticsEstimate = {
  id: string;
  customerId: string;
  status: string;
  pricingTotal: number;
  createdAt: Date;
  smartPricingDecision: {
    decision: string;
    confidenceScore: number;
    actingUserId: string | null;
    actingUser: {
      firstName: string | null;
      lastName: string | null;
      email: string;
    } | null;
  } | null;
  jobSites: { items: { category: string }[] }[];
};
export type AnalyticsJob = {
  id: string;
  customerId: string;
  status: string;
  scheduledStart: Date | null;
  scheduledEnd: Date | null;
  completedAt: Date | null;
  actualLaborHours: number | null;
  servicePlanId: string | null;
  estimate: { estimatedLaborHours: number | null; pricingTotal: number };
  invoice: { total: number } | null;
  assignments: { crewId: string | null; crew: { name: string } | null }[];
};
export type AnalyticsOutcome = {
  quotedAmount: number;
  collectedAmount: number;
  grossProfit: number | null;
  grossMarginPercent: number | null;
  estimateVariancePercent: number | null;
  classification: string;
  completedAt: Date;
  propertyType: string | null;
  job: { estimate: { jobSites: { items: { category: string }[] }[] } };
};
const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);
const avg = (values: number[]) =>
  values.length ? sum(values) / values.length : 0;
const pct = (part: number, total: number) => (total ? (part / total) * 100 : 0);
export function calculateAnalytics(input: {
  invoices: AnalyticsInvoice[];
  payments: AnalyticsPayment[];
  estimates: AnalyticsEstimate[];
  jobs: AnalyticsJob[];
  outcomes: AnalyticsOutcome[];
  newCustomerCount: number;
  activePlans: number;
  periodDays: number;
}) {
  const refunds = input.payments.flatMap((p) => p.refunds);
  const grossRevenue = sum(input.invoices.map((x) => x.total));
  const collected =
    sum(input.payments.map((x) => x.amount)) -
    sum(refunds.map((x) => x.amount));
  const completed = input.jobs.filter((x) => x.status === "Completed");
  const cancelled = input.jobs.filter((x) => x.status === "Cancelled");
  const accepted = input.estimates.filter((x) =>
    ["Approved", "Scheduled", "Converted"].includes(x.status),
  );
  const declined = input.estimates.filter((x) => x.status === "Declined");
  const pending = input.estimates.filter((x) => x.status === "Sent");
  const decided = accepted.length + declined.length;
  const customers = new Set(input.invoices.map((x) => x.customerId));
  const categoryRevenue = new Map<string, number>();
  for (const e of input.estimates) {
    const categories = [
      ...new Set(
        e.jobSites.flatMap((s) =>
          s.items.map((i) => i.category || "Uncategorized"),
        ),
      ),
    ];
    for (const c of categories)
      categoryRevenue.set(
        c,
        (categoryRevenue.get(c) ?? 0) + e.pricingTotal / categories.length,
      );
  }
  const crew = new Map<
    string,
    {
      name: string;
      jobs: number;
      revenue: number;
      estimatedHours: number;
      actualHours: number;
      overlaps: number;
    }
  >();
  for (const job of input.jobs) {
    for (const a of job.assignments.filter((a) => a.crewId && a.crew)) {
      const row = crew.get(a.crewId!) ?? {
        name: a.crew!.name,
        jobs: 0,
        revenue: 0,
        estimatedHours: 0,
        actualHours: 0,
        overlaps: 0,
      };
      if (job.status === "Completed") row.jobs++;
      row.revenue += job.invoice?.total ?? 0;
      row.estimatedHours += job.estimate.estimatedLaborHours ?? 0;
      row.actualHours += job.actualLaborHours ?? 0;
      crew.set(a.crewId!, row);
    }
  }
  for (const [id, row] of crew) {
    const jobs = input.jobs
      .filter(
        (j) =>
          j.assignments.some((a) => a.crewId === id) &&
          j.scheduledStart &&
          j.scheduledEnd,
      )
      .sort(
        (a, b) => a.scheduledStart!.getTime() - b.scheduledStart!.getTime(),
      );
    for (let i = 1; i < jobs.length; i++)
      if (jobs[i].scheduledStart! < jobs[i - 1].scheduledEnd!) row.overlaps++;
  }
  const estimators = new Map<
    string,
    { name: string; estimates: number; approved: number; revenue: number }
  >();
  for (const e of input.estimates) {
    const d = e.smartPricingDecision;
    if (!d?.actingUserId) continue;
    const row = estimators.get(d.actingUserId) ?? {
      name: d.actingUser
        ? [d.actingUser.firstName, d.actingUser.lastName]
            .filter(Boolean)
            .join(" ") || d.actingUser.email
        : "Unknown",
      estimates: 0,
      approved: 0,
      revenue: 0,
    };
    row.estimates++;
    if (accepted.includes(e)) {
      row.approved++;
      row.revenue += e.pricingTotal;
    }
    estimators.set(d.actingUserId, row);
  }
  const paymentMethods = Object.entries(
    input.payments.reduce<Record<string, number>>(
      (a, p) => ((a[p.method] = (a[p.method] ?? 0) + p.amount), a),
      {},
    ),
  ).map(([label, value]) => ({ label, value }));
  const now = new Date();
  const aging = { current: 0, days30: 0, days60: 0, days90Plus: 0 };
  for (const i of input.invoices.filter((i) => i.balanceDue > 0)) {
    const days = i.dueDate
      ? Math.floor((now.getTime() - i.dueDate.getTime()) / 86400000)
      : 0;
    if (days <= 0) aging.current += i.balanceDue;
    else if (days <= 30) aging.days30 += i.balanceDue;
    else if (days <= 60) aging.days60 += i.balanceDue;
    else aging.days90Plus += i.balanceDue;
  }
  const decisions = input.estimates.flatMap((e) =>
    e.smartPricingDecision ? [e.smartPricingDecision] : [],
  );
  const marginValues = input.outcomes.flatMap((o) =>
    o.grossMarginPercent == null ? [] : [o.grossMarginPercent],
  );
  const repeatCustomers = new Set(
    input.jobs
      .filter((job, index, all) =>
        all
          .slice(0, index)
          .some((prior) => prior.customerId === job.customerId),
      )
      .map((job) => job.customerId),
  );
  const cashFlow = new Map<string, number>();
  for (const payment of input.payments) {
    const key = payment.paymentDate.toISOString().slice(0, 10);
    cashFlow.set(
      key,
      (cashFlow.get(key) ?? 0) +
        payment.amount -
        sum(payment.refunds.map((refund) => refund.amount)),
    );
  }
  const pricingTrend = new Map<string, { quoted: number; collected: number }>();
  const profitability = new Map<string, { profit: number; revenue: number }>();
  for (const outcome of input.outcomes) {
    const month = outcome.completedAt.toISOString().slice(0, 7);
    const trend = pricingTrend.get(month) ?? { quoted: 0, collected: 0 };
    trend.quoted += outcome.quotedAmount;
    trend.collected += outcome.collectedAmount;
    pricingTrend.set(month, trend);
    const categories = [
      ...new Set(
        outcome.job.estimate.jobSites.flatMap((site) =>
          site.items.map((item) => item.category || "Uncategorized"),
        ),
      ),
    ];
    for (const category of categories) {
      const row = profitability.get(category) ?? { profit: 0, revenue: 0 };
      row.profit += (outcome.grossProfit ?? 0) / Math.max(1, categories.length);
      row.revenue += outcome.collectedAmount / Math.max(1, categories.length);
      profitability.set(category, row);
    }
  }
  const durations = completed.flatMap((j) =>
    j.scheduledStart && j.completedAt
      ? [(j.completedAt.getTime() - j.scheduledStart.getTime()) / 3600000]
      : [],
  );
  const capacityHours = input.periodDays * 8;
  return {
    revenue: {
      grossRevenue,
      collectedRevenue: collected,
      outstandingInvoices: sum(input.invoices.map((i) => i.balanceDue)),
      refundTotal: sum(refunds.map((r) => r.amount)),
      averageInvoice: avg(input.invoices.map((i) => i.total)),
      collectionRate: pct(collected, grossRevenue),
      byCategory: [...categoryRevenue]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value),
      byEstimator: [...estimators]
        .map(([id, x]) => ({ id, ...x }))
        .sort((a, b) => b.revenue - a.revenue),
      byCrew: [...crew]
        .map(([id, x]) => ({ id, ...x }))
        .sort((a, b) => b.revenue - a.revenue),
    },
    sales: {
      created: input.estimates.length,
      approvalRate: pct(accepted.length, decided),
      declineRate: pct(declined.length, decided),
      pending: pending.length,
      averageQuote: avg(input.estimates.map((e) => e.pricingTotal)),
      averageAcceptedQuote: avg(accepted.map((e) => e.pricingTotal)),
      conversionRate: pct(input.jobs.length, input.estimates.length),
      revenueFromEstimates: sum(accepted.map((e) => e.pricingTotal)),
      estimators: [...estimators]
        .map(([id, x]) => ({
          id,
          ...x,
          approvalRate: pct(x.approved, x.estimates),
        }))
        .sort((a, b) => b.revenue - a.revenue),
    },
    operations: {
      completed: completed.length,
      cancelled: cancelled.length,
      averageDurationHours: avg(durations),
      averageCompletionDelayHours: avg(
        completed.flatMap((j) =>
          j.scheduledEnd && j.completedAt
            ? [
                Math.max(
                  0,
                  (j.completedAt.getTime() - j.scheduledEnd.getTime()) /
                    3600000,
                ),
              ]
            : [],
        ),
      ),
      recurringJobs: input.jobs.filter((j) => j.servicePlanId).length,
      crewUtilization: pct(
        sum([...crew.values()].map((c) => c.actualHours || c.estimatedHours)),
        Math.max(1, crew.size) * capacityHours,
      ),
      capacityUtilization: pct(
        sum([...crew.values()].map((c) => c.estimatedHours)),
        Math.max(1, crew.size) * capacityHours,
      ),
    },
    customers: {
      newCustomers: input.newCustomerCount,
      returningCustomers: Math.max(
        0,
        [...new Set(input.jobs.map((j) => j.customerId))].length -
          input.newCustomerCount,
      ),
      repeatJobRate: pct(
        repeatCustomers.size,
        new Set(input.jobs.map((j) => j.customerId)).size,
      ),
      retentionRate: pct(
        repeatCustomers.size,
        new Set(input.jobs.map((j) => j.customerId)).size,
      ),
      lifetimeValue: avg(
        [...customers].map((c) =>
          sum(
            input.invoices
              .filter((i) => i.customerId === c)
              .map((i) => i.total),
          ),
        ),
      ),
      activePlans: input.activePlans,
      averageRevenuePerCustomer: customers.size
        ? grossRevenue / customers.size
        : 0,
    },
    smartPricing: {
      acceptanceRate: pct(
        decisions.filter((d) => d.decision === "Accepted").length,
        decisions.length,
      ),
      underbidRate: pct(
        input.outcomes.filter((o) => o.classification === "underbid").length,
        input.outcomes.length,
      ),
      overbidRate: pct(
        input.outcomes.filter((o) => o.classification === "overbid").length,
        input.outcomes.length,
      ),
      estimateAccuracy: Math.max(
        0,
        100 -
          avg(
            input.outcomes.flatMap((o) =>
              o.estimateVariancePercent == null
                ? []
                : [Math.abs(o.estimateVariancePercent)],
            ),
          ),
      ),
      grossMargin: avg(marginValues),
      profitabilityByCategory: [...profitability]
        .map(([label, value]) => ({
          label,
          ...value,
          margin: pct(value.profit, value.revenue),
        }))
        .sort((a, b) => b.profit - a.profit),
      historicalTrend: [...pricingTrend]
        .map(([label, value]) => ({ label, ...value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      confidenceDistribution: [0, 20, 40, 60, 80].map((min) => ({
        label: `${min}-${min + 19}`,
        value: decisions.filter(
          (d) => d.confidenceScore >= min && d.confidenceScore < min + 20,
        ).length,
      })),
    },
    crews: [...crew].map(([id, x]) => ({
      id,
      ...x,
      averageCompletionTime: x.jobs ? x.actualHours / x.jobs : 0,
      capacityUsage: pct(x.estimatedHours, capacityHours),
      idlePercentage: Math.max(
        0,
        100 - pct(x.actualHours || x.estimatedHours, capacityHours),
      ),
    })),
    financial: {
      accountsReceivable: sum(input.invoices.map((i) => i.balanceDue)),
      aging,
      paymentMethods,
      collectionRate: pct(collected, grossRevenue),
      cashFlowTrend: [...cashFlow]
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label)),
    },
  };
}
