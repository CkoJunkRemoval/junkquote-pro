import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { calculateAnalytics } from "./calculations";
import type { AnalyticsFilters } from "./filters";
export const getAnalyticsData = cache(
  async (companyId: string, f: AnalyticsFilters) => {
    await validate(companyId, f);
    const categoryWhere = f.category
      ? { jobSites: { some: { items: { some: { category: f.category } } } } }
      : {};
    const estimatorWhere = f.estimatorId
      ? { smartPricingDecision: { actingUserId: f.estimatorId, companyId } }
      : {};
    const crewJobWhere = f.crewId
      ? { assignments: { some: { companyId, crewId: f.crewId } } }
      : {};
    const relatedJobWhere = {
      ...(f.crewId
        ? { assignments: { some: { companyId, crewId: f.crewId } } }
        : {}),
      ...(f.recurringOnly ? { servicePlanId: { not: null } } : {}),
      ...(f.completedOnly ? { status: "Completed" as const } : {}),
    };
    const hasRelatedJobFilter = Boolean(
      f.crewId || f.recurringOnly || f.completedOnly,
    );
    const commonJob = {
      companyId,
      createdAt: { gte: f.from, lte: f.to },
      ...(f.customerId ? { customerId: f.customerId } : {}),
      ...(f.recurringOnly ? { servicePlanId: { not: null } } : {}),
      ...(f.completedOnly ? { status: "Completed" as const } : {}),
      ...crewJobWhere,
      estimate: { companyId, ...categoryWhere, ...estimatorWhere },
    };
    const [
      invoices,
      payments,
      estimates,
      jobs,
      outcomes,
      newCustomerCount,
      activePlans,
      priorPayments,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: {
          companyId,
          createdAt: { gte: f.from, lte: f.to },
          ...(f.customerId ? { customerId: f.customerId } : {}),
          estimate: { ...categoryWhere, ...estimatorWhere },
          ...(hasRelatedJobFilter ? { job: relatedJobWhere } : {}),
        },
        take: 10000,
        select: {
          id: true,
          customerId: true,
          total: true,
          balanceDue: true,
          status: true,
          createdAt: true,
          issuedDate: true,
          dueDate: true,
          estimateId: true,
          jobId: true,
        },
      }),
      prisma.payment.findMany({
        where: {
          companyId,
          paymentDate: { gte: f.from, lte: f.to },
          invoice: {
            companyId,
            ...(f.customerId ? { customerId: f.customerId } : {}),
            estimate: { ...categoryWhere, ...estimatorWhere },
            ...(hasRelatedJobFilter ? { job: relatedJobWhere } : {}),
          },
        },
        take: 10000,
        select: {
          amount: true,
          method: true,
          paymentDate: true,
          refunds: {
            where: { refundedAt: { gte: f.from, lte: f.to } },
            select: { amount: true, refundedAt: true },
          },
          invoice: { select: { customerId: true, jobId: true } },
        },
      }),
      prisma.estimate.findMany({
        where: {
          companyId,
          createdAt: { gte: f.from, lte: f.to },
          ...(f.customerId ? { customerId: f.customerId } : {}),
          ...categoryWhere,
          ...estimatorWhere,
          ...(hasRelatedJobFilter ? { job: relatedJobWhere } : {}),
        },
        take: 10000,
        select: {
          id: true,
          customerId: true,
          status: true,
          pricingTotal: true,
          createdAt: true,
          smartPricingDecision: {
            select: {
              decision: true,
              confidenceScore: true,
              actingUserId: true,
              actingUser: {
                select: { firstName: true, lastName: true, email: true },
              },
            },
          },
          jobSites: { select: { items: { select: { category: true } } } },
        },
      }),
      prisma.job.findMany({
        where: commonJob,
        take: 10000,
        select: {
          id: true,
          customerId: true,
          status: true,
          scheduledStart: true,
          scheduledEnd: true,
          completedAt: true,
          actualLaborHours: true,
          servicePlanId: true,
          estimate: {
            select: { estimatedLaborHours: true, pricingTotal: true },
          },
          invoice: { select: { total: true } },
          assignments: {
            where: { companyId },
            select: { crewId: true, crew: { select: { name: true } } },
          },
        },
      }),
      prisma.pricingOutcome.findMany({
        where: {
          companyId,
          completedAt: { gte: f.from, lte: f.to },
          ...(f.customerId ? { customerId: f.customerId } : {}),
          job: {
            ...crewJobWhere,
            ...(f.recurringOnly ? { servicePlanId: { not: null } } : {}),
            estimate: { ...categoryWhere, ...estimatorWhere },
          },
        },
        take: 10000,
        select: {
          quotedAmount: true,
          collectedAmount: true,
          grossProfit: true,
          grossMarginPercent: true,
          estimateVariancePercent: true,
          classification: true,
          completedAt: true,
          propertyType: true,
          job: {
            select: {
              estimate: {
                select: {
                  jobSites: {
                    select: { items: { select: { category: true } } },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.customer.count({
        where: {
          companyId,
          createdAt: { gte: f.from, lte: f.to },
          ...(f.customerId ? { id: f.customerId } : {}),
        },
      }),
      prisma.servicePlan.count({
        where: {
          companyId,
          status: "Active",
          ...(f.customerId ? { customerId: f.customerId } : {}),
        },
      }),
      prisma.payment.aggregate({
        where: {
          companyId,
          paymentDate: {
            gte: new Date(
              f.from.getTime() - (f.to.getTime() - f.from.getTime()) - 1,
            ),
            lt: f.from,
          },
        },
        _sum: { amount: true },
      }),
    ]);
    const periodDays = Math.max(
      1,
      Math.ceil((f.to.getTime() - f.from.getTime()) / 86400000),
    );
    const result = calculateAnalytics({
      invoices,
      payments,
      estimates,
      jobs,
      outcomes,
      newCustomerCount,
      activePlans,
      periodDays,
    });
    const now = new Date();
    const day = new Date(now); day.setHours(0, 0, 0, 0);
    const week = new Date(day); week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    const year = new Date(now.getFullYear(), 0, 1);
    const periodRevenueRows = await Promise.all(
      [day, week, month, quarter, year].map((from) =>
        prisma.payment.findMany({
          where: { companyId, paymentDate: { gte: from, lte: now } },
          select: { amount: true, refunds: { select: { amount: true } } },
        }),
      ),
    );
    const periodRevenue = Object.fromEntries(
      ["today", "week", "month", "quarter", "year"].map((key, index) => [
        key,
        periodRevenueRows[index].reduce(
          (total, payment) =>
            total +
            payment.amount -
            payment.refunds.reduce((refunds, refund) => refunds + refund.amount, 0),
          0,
        ),
      ]),
    ) as Record<"today" | "week" | "month" | "quarter" | "year", number>;
    const prior = priorPayments._sum.amount ?? 0;
    return {
      ...result,
      revenue: {
        ...result.revenue,
        periods: periodRevenue,
        growth: prior
          ? ((result.revenue.collectedRevenue - prior) / prior) * 100
          : 0,
      },
      meta: {
        from: f.from,
        to: f.to,
        truncated: [invoices, payments, estimates, jobs, outcomes].some(
          (x) => x.length === 10000,
        ),
      },
    };
  },
);
export const getAnalyticsFilterOptions = cache(async (companyId: string) => {
  const [estimators, crews, customers, categories] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyId,
        active: true,
        memberships: {
          some: {
            companyId,
            status: "Active",
            role: { in: ["Owner", "Admin", "Manager"] },
          },
        },
      },
      select: { id: true, firstName: true, lastName: true, email: true },
      orderBy: { email: "asc" },
    }),
    prisma.crew.findMany({
      where: { companyId, active: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.customer.findMany({
      where: { companyId },
      take: 1000,
      select: { id: true, firstName: true, lastName: true },
      orderBy: { lastName: "asc" },
    }),
    prisma.estimateItem.findMany({
      where: { jobSite: { estimate: { companyId } } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    }),
  ]);
  return {
    estimators,
    crews,
    customers,
    categories: categories.map((x) => x.category).filter(Boolean),
  };
});
async function validate(companyId: string, f: AnalyticsFilters) {
  const checks = await Promise.all([
    f.estimatorId
      ? prisma.user.count({ where: { id: f.estimatorId, companyId } })
      : 1,
    f.crewId ? prisma.crew.count({ where: { id: f.crewId, companyId } }) : 1,
    f.customerId
      ? prisma.customer.count({ where: { id: f.customerId, companyId } })
      : 1,
  ]);
  if (checks.some((x) => !x))
    throw new Error("An analytics filter is not available for this company.");
}
