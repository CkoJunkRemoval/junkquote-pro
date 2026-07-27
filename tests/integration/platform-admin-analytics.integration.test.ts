import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getActivationFunnel, getPlatformOverview, getPlatformUsage } from "@/lib/admin/platformAnalytics";
import { resetIntegrationDatabase } from "./fixtures";

describe("platform administration analytics", () => {
  beforeEach(resetIntegrationDatabase);
  afterEach(resetIntegrationDatabase);

  it("aggregates across tenants without exposing tenant content", async () => {
    const now = new Date();
    const [one, two] = await Promise.all([
      prisma.company.create({ data: { name: "Analytics One", onboarding: { create: { completedAt: now } } } }),
      prisma.company.create({ data: { name: "Analytics Two" } }),
    ]);
    const [actorOne, actorTwo] = await Promise.all([
      prisma.user.create({ data: { companyId: one.id, email: "analytics-one@test.invalid", passwordHash: "test-only", role: "OWNER" } }),
      prisma.user.create({ data: { companyId: two.id, email: "analytics-two@test.invalid", passwordHash: "test-only", role: "OWNER" } }),
    ]);
    await prisma.auditEvent.createMany({ data: [
      { companyId: one.id, actingUserId: actorOne.id, eventType: "estimate.created", entityType: "Estimate" },
      { companyId: one.id, actingUserId: actorOne.id, eventType: "job.created", entityType: "Job" },
      { companyId: two.id, actingUserId: actorTwo.id, eventType: "authentication.login_succeeded", entityType: "User" },
    ] });
    await prisma.companyUsageDaily.create({ data: { companyId: one.id, date: now, estimates: 2, jobs: 1 } });

    const [overview, funnel, usage] = await Promise.all([
      getPlatformOverview(now), getActivationFunnel(), getPlatformUsage(now),
    ]);

    expect(overview.registered).toBe(2);
    expect(overview.activeToday).toBe(1);
    expect(funnel.find((row) => row.label === "Onboarding completed")?.companies).toBe(1);
    expect(usage.monthlyActiveUsers).toBe(1);
    expect(usage.daily.at(-1)).toMatchObject({ activeUsers: 1, companies: 1, estimates: 2, jobs: 1 });
    expect(JSON.stringify({ overview, funnel, usage })).not.toContain("analytics-one@test.invalid");
  });
});
