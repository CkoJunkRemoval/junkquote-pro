import { describe, expect, it } from "vitest";
import {
  calculateAnalytics,
  type AnalyticsEstimate,
  type AnalyticsInvoice,
  type AnalyticsJob,
  type AnalyticsOutcome,
  type AnalyticsPayment,
} from "./calculations";
const now = new Date("2026-07-18T16:00:00Z");
function sample() {
  const invoices: AnalyticsInvoice[] = [
    {
      id: "i",
      customerId: "c",
      total: 500,
      balanceDue: 100,
      status: "Partial",
      createdAt: now,
      issuedDate: now,
      dueDate: new Date("2026-06-01"),
      estimateId: "e",
      jobId: "j",
    },
  ];
  const payments: AnalyticsPayment[] = [
    {
      amount: 400,
      method: "Card",
      paymentDate: now,
      refunds: [{ amount: 50, refundedAt: now }],
      invoice: { customerId: "c", jobId: "j" },
    },
  ];
  const decision = {
    decision: "Accepted",
    confidenceScore: 85,
    actingUserId: "u",
    actingUser: { firstName: "Ada", lastName: "Lee", email: "a@test" },
  };
  const estimates: AnalyticsEstimate[] = [
    {
      id: "e",
      customerId: "c",
      status: "Approved",
      pricingTotal: 500,
      createdAt: now,
      smartPricingDecision: decision,
      jobSites: [{ items: [{ category: "Furniture" }] }],
    },
  ];
  const jobs: AnalyticsJob[] = [
    {
      id: "j",
      customerId: "c",
      status: "Completed",
      scheduledStart: new Date("2026-07-18T12:00:00Z"),
      scheduledEnd: new Date("2026-07-18T14:00:00Z"),
      completedAt: new Date("2026-07-18T15:00:00Z"),
      actualLaborHours: 3,
      servicePlanId: "p",
      estimate: { estimatedLaborHours: 2, pricingTotal: 500 },
      invoice: { total: 500 },
      assignments: [{ crewId: "crew", crew: { name: "A Team" } }],
    },
  ];
  const outcomes: AnalyticsOutcome[] = [
    {
      quotedAmount: 500,
      collectedAmount: 350,
      grossProfit: 150,
      grossMarginPercent: 42.8,
      estimateVariancePercent: -30,
      classification: "underbid",
      completedAt: now,
      propertyType: "House",
      job: { estimate: { jobSites: [{ items: [{ category: "Furniture" }] }] } },
    },
  ];
  return {
    invoices,
    payments,
    estimates,
    jobs,
    outcomes,
    newCustomerCount: 1,
    activePlans: 1,
    periodDays: 30,
  };
}
describe("analytics calculations", () => {
  it("calculates revenue net of durable refunds", () => {
    const x = calculateAnalytics(sample());
    expect(x.revenue).toMatchObject({
      grossRevenue: 500,
      collectedRevenue: 350,
      refundTotal: 50,
      outstandingInvoices: 100,
    });
    expect(x.financial.collectionRate).toBe(70);
  });
  it("calculates sales, recurring, and pricing metrics", () => {
    const x = calculateAnalytics(sample());
    expect(x.sales.approvalRate).toBe(100);
    expect(x.operations).toMatchObject({
      completed: 1,
      recurringJobs: 1,
      averageDurationHours: 3,
      averageCompletionDelayHours: 1,
    });
    expect(x.smartPricing).toMatchObject({
      acceptanceRate: 100,
      underbidRate: 100,
      estimateAccuracy: 70,
    });
  });
  it("aggregates crew capacity and overlap safely", () => {
    const input = sample();
    input.jobs.push({
      ...input.jobs[0],
      id: "j2",
      scheduledStart: new Date("2026-07-18T13:00:00Z"),
      scheduledEnd: new Date("2026-07-18T16:00:00Z"),
    });
    const crew = calculateAnalytics(input).crews[0];
    expect(crew.jobs).toBe(2);
    expect(crew.overlaps).toBe(1);
  });
  it("handles empty history without NaN", () => {
    const empty = calculateAnalytics({
      invoices: [],
      payments: [],
      estimates: [],
      jobs: [],
      outcomes: [],
      newCustomerCount: 0,
      activePlans: 0,
      periodDays: 1,
    });
    expect(empty.revenue.averageInvoice).toBe(0);
    expect(empty.smartPricing.estimateAccuracy).toBe(100);
    expect(empty.customers.averageRevenuePerCustomer).toBe(0);
  });
  it("handles a large deterministic dataset", () => {
    const input = sample();
    input.invoices = Array.from({ length: 10000 }, (_, i) => ({
      ...input.invoices[0],
      id: String(i),
    }));
    expect(calculateAnalytics(input).revenue.grossRevenue).toBe(5_000_000);
  });
});
