import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import {
  getAnalyticsData,
  getAnalyticsFilterOptions,
} from "@/lib/analytics/service";
import type { AnalyticsFilters } from "@/lib/analytics/filters";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
const range = (extra: Partial<AnalyticsFilters> = {}): AnalyticsFilters => ({
  from: new Date("2020-01-01T00:00:00Z"),
  to: new Date("2030-12-31T23:59:59Z"),
  recurringOnly: false,
  completedOnly: false,
  ...extra,
});
describe("analytics real database", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);
  it("aggregates each tenant without leaking another company", async () => {
    const { a, b } = await createTenantFixtures();
    await prisma.refund.create({
      data: {
        companyId: a.company.id,
        paymentId: a.payment.id,
        invoiceId: a.invoice.id,
        amount: 5,
        refundedAt: new Date(),
        createdByUserId: a.user.id,
      },
    });
    const data = await getAnalyticsData(a.company.id, range());
    expect(data.revenue).toMatchObject({
      grossRevenue: 100,
      collectedRevenue: 20,
      refundTotal: 5,
    });
    expect(data.sales.created).toBe(1);
    expect(data.revenue.grossRevenue).not.toBe(200);
    expect(
      (await getAnalyticsData(b.company.id, range())).revenue.collectedRevenue,
    ).toBe(25);
  });
  it("rejects cross-tenant filters and scopes option lists", async () => {
    const { a, b } = await createTenantFixtures();
    await expect(
      getAnalyticsData(a.company.id, range({ crewId: b.crew.id })),
    ).rejects.toThrow("not available");
    const options = await getAnalyticsFilterOptions(a.company.id);
    expect(options.crews.map((x) => x.id)).toEqual([a.crew.id]);
    expect(options.customers.map((x) => x.id)).toEqual([a.customer.id]);
  });
  it("combines crew, category, customer, and completed filters", async () => {
    const { a } = await createTenantFixtures();
    await prisma.jobSite.create({
      data: {
        estimateId: a.estimate.id,
        name: "Main",
        sortOrder: 0,
        items: {
          create: {
            itemId: "sofa",
            name: "Sofa",
            category: "Furniture",
            quantity: 1,
            sortOrder: 0,
          },
        },
      },
    });
    await prisma.jobAssignment.create({
      data: { companyId: a.company.id, jobId: a.job.id, crewId: a.crew.id },
    });
    await prisma.job.update({
      where: { id: a.job.id },
      data: { status: "Completed", completedAt: new Date() },
    });
    const data = await getAnalyticsData(
      a.company.id,
      range({
        crewId: a.crew.id,
        customerId: a.customer.id,
        category: "Furniture",
        completedOnly: true,
      }),
    );
    expect(data.operations.completed).toBe(1);
    expect(data.revenue.byCategory).toContainEqual({
      label: "Furniture",
      value: 100,
    });
  });
  it("includes recurring and Smart Pricing outcome metrics", async () => {
    const { a } = await createTenantFixtures();
    const plan = await prisma.servicePlan.create({
      data: {
        companyId: a.company.id,
        customerId: a.customer.id,
        propertyId: a.property.id,
        name: "Monthly",
        status: "Active",
        recurrenceType: "Monthly",
        interval: 1,
        daysOfWeek: [],
        startDate: new Date(),
        createdByUserId: a.user.id,
      },
    });
    await prisma.job.update({
      where: { id: a.job.id },
      data: {
        servicePlanId: plan.id,
        status: "Completed",
        completedAt: new Date(),
        actualLaborHours: 2,
      },
    });
    await prisma.smartPricingDecision.create({
      data: {
        companyId: a.company.id,
        estimateId: a.estimate.id,
        recommendedPrice: 100,
        confidenceScore: 80,
        historicalSampleSize: 10,
        manualPrice: 100,
        decision: "Accepted",
        accepted: true,
        decidedAt: new Date(),
        actingUserId: a.user.id,
      },
    });
    await prisma.pricingOutcome.create({
      data: {
        companyId: a.company.id,
        estimateId: a.estimate.id,
        jobId: a.job.id,
        invoiceId: a.invoice.id,
        customerId: a.customer.id,
        quotedAmount: 100,
        invoicedAmount: 100,
        collectedAmount: 25,
        discountAmount: 0,
        refundAmount: 0,
        grossProfit: 10,
        grossMarginPercent: 40,
        estimateVarianceAmount: -75,
        estimateVariancePercent: -75,
        completenessScore: 100,
        missingData: [],
        classification: "underbid",
        collectionStatus: "partial",
        completedAt: new Date(),
        calculatedAt: new Date(),
      },
    });
    const data = await getAnalyticsData(
      a.company.id,
      range({ recurringOnly: true }),
    );
    expect(data.operations.recurringJobs).toBe(1);
    expect(data.customers.activePlans).toBe(1);
    expect(data.smartPricing).toMatchObject({
      acceptanceRate: 100,
      underbidRate: 100,
      grossMargin: 40,
    });
  });
});
