import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";
import {
  assignDispatchCrew,
  getDispatchData,
  updateDispatchJob,
} from "@/lib/dispatch/dispatch";
describe("dispatch real database", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);
  it("tenant-scopes board data and mutation", async () => {
    const { a, b } = await createTenantFixtures();
    const now = new Date();
    await prisma.job.update({
      where: { id: a.job.id },
      data: {
        status: "Scheduled",
        scheduledStart: now,
        scheduledEnd: new Date(now.getTime() + 3600000),
      },
    });
    expect(
      (await getDispatchData(a.company.id, now)).jobs.map((j) => j.id),
    ).toContain(a.job.id);
    expect(
      (await getDispatchData(b.company.id, now)).jobs.map((j) => j.id),
    ).not.toContain(a.job.id);
    await expect(
      updateDispatchJob(a.company.id, b.job.id, { priority: "Urgent" }),
    ).rejects.toThrow("Job not found");
  });
  it("persists drag/status, priority, progress, and tenant-safe assignments", async () => {
    const { a, b } = await createTenantFixtures();
    const now = new Date();
    await updateDispatchJob(a.company.id, a.job.id, {
      status: "Scheduled",
      scheduledStart: now,
      scheduledEnd: new Date(now.getTime() + 3600000),
    });
    await updateDispatchJob(a.company.id, a.job.id, { status: "InProgress" });
    await updateDispatchJob(a.company.id, a.job.id, {
      dispatchProgress: "EnRoute",
      priority: "High",
    });
    await assignDispatchCrew(a.company.id, a.job.id, a.crew.id);
    await expect(
      assignDispatchCrew(a.company.id, a.job.id, b.crew.id),
    ).rejects.toThrow("not found");
    expect(
      await prisma.job.findUnique({ where: { id: a.job.id } }),
    ).toMatchObject({
      status: "InProgress",
      dispatchProgress: "EnRoute",
      priority: "High",
    });
  });
  it("includes recurring, invoice, payment, and alert data", async () => {
    const { a } = await createTenantFixtures();
    const now = new Date();
    const plan = await prisma.servicePlan.create({ data: { companyId: a.company.id, customerId: a.customer.id, propertyId: a.property.id, name: "Recurring", recurrenceType: "CustomInterval", interval: 30, daysOfWeek: [], startDate: now, createdByUserId: a.user.id } });
    await prisma.job.update({
      where: { id: a.job.id },
      data: {
        status: "Completed",
        scheduledStart: new Date(now.getTime() - 7200000),
        scheduledEnd: new Date(now.getTime() - 3600000),
        completedAt: now,
        servicePlanId: plan.id,
        servicePlanOccurrence: new Date(now.getTime() - 7200000),
      },
    });
    const data = await getDispatchData(a.company.id, now);
    const job = data.jobs.find((row) => row.id === a.job.id);
    expect(job).toMatchObject({ paymentStatus: "Partial", servicePlan: { name: "Recurring" } });
    expect(data.metrics.completedJobs).toBe(1);
    expect(job?.notifications).toContain("Missing after photos");
  });
});
