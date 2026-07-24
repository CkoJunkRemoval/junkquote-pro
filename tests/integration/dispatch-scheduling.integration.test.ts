import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { getDispatchData } from "@/lib/dispatch/dispatch";
import {
  applyRouteCrewAssignment,
  applyRouteOrderSwap,
  inspectScheduleConflicts,
  scheduleJob,
  unassignDispatchResources,
  updateSchedulingStatus,
  type ScheduleJobInput,
} from "@/lib/dispatch/scheduling";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

const start = new Date("2026-08-10T13:00:00.000Z");
const end = new Date("2026-08-10T15:00:00.000Z");

async function resources(companyId: string) {
  const employee = await prisma.employee.findFirstOrThrow({
    where: { companyId },
  });
  const vehicle = await prisma.fleetAsset.create({
    data: {
      companyId,
      name: "Box Truck 1",
      type: "BoxTruck",
      capacityCubicYards: 18,
    },
  });
  return { employee, vehicle };
}
const input = (
  employeeId: string,
  vehicleId: string,
  extra: Partial<ScheduleJobInput> = {},
): ScheduleJobInput => ({
  scheduledStart: start,
  scheduledEnd: end,
  estimatedDurationMinutes: 120,
  schedulingStatus: "Scheduled",
  employeeAssignments: [{ employeeId, role: "CrewLead", lead: true }],
  vehicleIds: [vehicleId],
  timeZone: "America/New_York",
  expectedVersion: 0,
  ...extra,
});

describe("dispatch scheduling foundation", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("schedules crew and vehicles with an auditable event boundary", async () => {
    const { a } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    const result = await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    expect(result.job).toMatchObject({
      schedulingStatus: "Scheduled",
      scheduleVersion: 1,
      estimatedDurationMinutes: 120,
    });
    expect(
      await prisma.jobAssignment.findFirst({
        where: { jobId: a.job.id, employeeId: employee.id },
      }),
    ).toMatchObject({ role: "CrewLead", lead: true });
    expect(
      await prisma.jobVehicleAssignment.findFirst({
        where: { jobId: a.job.id, fleetAssetId: vehicle.id },
      }),
    ).not.toBeNull();
    expect(
      await prisma.auditEvent.findFirst({
        where: { entityId: a.job.id, eventType: "JOB_SCHEDULED" },
      }),
    ).not.toBeNull();
    expect(
      await prisma.auditEvent.findFirst({
        where: { entityId: a.job.id, eventType: "DISPATCH_ASSIGNMENT_CHANGED" },
      }),
    ).not.toBeNull();
  });

  it("reschedules, confirms, and cancels with reasons in history", async () => {
    const { a } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id, {
        scheduledStart: new Date("2026-08-11T13:00:00Z"),
        scheduledEnd: new Date("2026-08-11T15:00:00Z"),
        expectedVersion: 1,
      }),
    );
    await updateSchedulingStatus(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      "Confirmed",
    );
    await expect(
      updateSchedulingStatus(
        a.company.id,
        a.user.id,
        "Owner",
        a.job.id,
        "Cancelled",
      ),
    ).rejects.toThrow("reason");
    await updateSchedulingStatus(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      "Cancelled",
      "Customer requested another date",
    );
    expect(
      await prisma.auditEvent.count({
        where: {
          entityId: a.job.id,
          eventType: {
            in: ["JOB_RESCHEDULED", "JOB_CONFIRMED", "JOB_CANCELLED"],
          },
        },
      }),
    ).toBe(3);
    expect(
      await prisma.auditEvent.findFirst({
        where: { entityId: a.job.id, eventType: "JOB_MOVED" },
      }),
    ).not.toBeNull();
  });

  it("unassigns dispatch resources through a tenant-scoped audited mutation", async () => {
    const { a, b } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    await expect(
      unassignDispatchResources(b.company.id, b.user.id, a.job.id, "both"),
    ).rejects.toThrow("not found");
    await unassignDispatchResources(a.company.id, a.user.id, a.job.id, "both");
    expect(
      await prisma.jobAssignment.count({
        where: { jobId: a.job.id, employeeId: { not: null } },
      }),
    ).toBe(0);
    expect(
      await prisma.jobVehicleAssignment.count({ where: { jobId: a.job.id } }),
    ).toBe(0);
    expect(
      await prisma.auditEvent.findFirst({
        where: {
          entityId: a.job.id,
          eventType: "DISPATCH_ASSIGNMENT_CHANGED",
          metadata: { path: ["action"], equals: "unassign" },
        },
      }),
    ).not.toBeNull();
  });

  it("blocks employee and vehicle overlaps and duplicate assignments", async () => {
    const { a } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    const estimate = await prisma.estimate.create({
      data: {
        companyId: a.company.id,
        pricingProfileId: a.pricingProfile.id,
        customerId: a.customer.id,
        propertyId: a.property.id,
      },
    });
    const job = await prisma.job.create({
      data: {
        companyId: a.company.id,
        estimateId: estimate.id,
        customerId: a.customer.id,
        propertyId: a.property.id,
      },
    });
    const inspection = await inspectScheduleConflicts(
      a.company.id,
      job.id,
      input(employee.id, vehicle.id),
    );
    expect(inspection.conflicts.map((row) => row.code)).toEqual(
      expect.arrayContaining(["EMPLOYEE_OVERLAP", "VEHICLE_OVERLAP"]),
    );
    await expect(
      scheduleJob(
        a.company.id,
        a.user.id,
        "Owner",
        job.id,
        input(employee.id, vehicle.id),
      ),
    ).rejects.toThrow("overlaps");
    await expect(
      inspectScheduleConflicts(
        a.company.id,
        job.id,
        input(employee.id, vehicle.id, {
          employeeAssignments: [
            { employeeId: employee.id, role: "Driver", lead: true },
            { employeeId: employee.id, role: "Helper", lead: false },
          ],
        }),
      ),
    ).rejects.toThrow("twice");
  });

  it("enforces tenant isolation and warning override reasons", async () => {
    const { a, b } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await expect(
      scheduleJob(
        b.company.id,
        b.user.id,
        "Owner",
        a.job.id,
        input(employee.id, vehicle.id),
      ),
    ).rejects.toThrow("not found");
    await expect(
      scheduleJob(
        a.company.id,
        a.user.id,
        "Office",
        a.job.id,
        input(employee.id, vehicle.id, { vehicleIds: [] }),
      ),
    ).rejects.toThrow("Owner or Admin");
    await expect(
      scheduleJob(
        a.company.id,
        a.user.id,
        "Owner",
        a.job.id,
        input(employee.id, vehicle.id, {
          vehicleIds: [],
          overrideReason: "Rental vehicle will be collected on site",
        }),
      ),
    ).resolves.toBeDefined();
  });

  it("returns bounded views, unscheduled work, and assigned-only crew results", async () => {
    const { a } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await prisma.employee.update({
      where: { id: employee.id },
      data: { userId: a.user.id },
    });
    const before = await getDispatchData(a.company.id, start, undefined, {
      view: "week",
    });
    expect(before.unscheduled.some((job) => job.id === a.job.id)).toBe(true);
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    const after = await getDispatchData(a.company.id, start, a.user.id, {
      view: "week",
    });
    expect(after.jobs.map((job) => job.id)).toContain(a.job.id);
    expect(after.end.getTime() - after.start.getTime()).toBe(7 * 86400000);
  });

  it("projects tenant-scoped route intelligence and applies an audited safe swap", async () => {
    const { a, b } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    await prisma.property.update({
      where: { id: a.property.id },
      data: { latitude: 37.549349, longitude: -77.460606, zip: "23220" },
    });
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    const property = await prisma.property.create({
      data: {
        customerId: a.customer.id,
        address: "Second",
        city: "Richmond",
        state: "VA",
        zip: "23223",
        latitude: 37.557767,
        longitude: -77.378886,
      },
    });
    const estimate = await prisma.estimate.create({
      data: {
        companyId: a.company.id,
        pricingProfileId: a.pricingProfile.id,
        customerId: a.customer.id,
        propertyId: property.id,
        status: "Approved",
      },
    });
    const second = await prisma.job.create({
      data: {
        companyId: a.company.id,
        estimateId: estimate.id,
        customerId: a.customer.id,
        propertyId: property.id,
      },
    });
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      second.id,
      input(employee.id, vehicle.id, {
        scheduledStart: new Date("2026-08-10T16:00:00Z"),
        scheduledEnd: new Date("2026-08-10T18:00:00Z"),
      }),
    );
    const data = await getDispatchData(a.company.id, start, undefined, {
      view: "day",
      grouping: "vehicle",
    });
    expect(data.routeIntelligence.routes).toHaveLength(1);
    expect(data.routeIntelligence.routes[0]).toMatchObject({
      laneId: vehicle.id,
      confidence: "High",
    });
    expect(
      data.routeIntelligence.routes[0].stops.map((stop) => stop.jobId),
    ).toEqual([a.job.id, second.id]);
    expect(
      data.routeIntelligence.routes.flatMap((route) =>
        route.stops.map((stop) => stop.jobId),
      ),
    ).not.toContain(b.job.id);

    await applyRouteOrderSwap(
      a.company.id,
      a.user.id,
      "Owner",
      [a.job.id, second.id],
      {
        id: `swap:${a.job.id}:${second.id}`,
        estimatedBenefit: "1.0 estimated miles",
        confidence: "High",
      },
    );
    const changed = await prisma.job.findMany({
      where: { id: { in: [a.job.id, second.id] } },
      orderBy: { scheduledStart: "asc" },
    });
    expect(changed.map((job) => job.id)).toEqual([second.id, a.job.id]);
    expect(
      await prisma.auditEvent.findFirst({
        where: {
          companyId: a.company.id,
          eventType: "ROUTE_SUGGESTION_APPLIED",
        },
      }),
    ).not.toBeNull();
  });

  it("applies a tenant-scoped route crew suggestion through schedule validation", async () => {
    const { a, b } = await createTenantFixtures();
    const { employee, vehicle } = await resources(a.company.id);
    const closerEmployee = await prisma.employee.create({
      data: {
        companyId: a.company.id,
        firstName: "Closer",
        lastName: "Crew",
        role: "CrewLead",
        certifications: [],
      },
    });
    await scheduleJob(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      input(employee.id, vehicle.id),
    );
    await expect(
      applyRouteCrewAssignment(
        b.company.id,
        b.user.id,
        "Owner",
        a.job.id,
        closerEmployee.id,
        {
          id: "closer:cross-tenant",
          type: "CLOSER_AVAILABLE_CREW",
          estimatedBenefit: "5.0 estimated miles",
          confidence: "Medium",
        },
      ),
    ).rejects.toThrow("not found");
    await applyRouteCrewAssignment(
      a.company.id,
      a.user.id,
      "Owner",
      a.job.id,
      closerEmployee.id,
      {
        id: `closer:${a.job.id}:${closerEmployee.id}`,
        type: "CLOSER_AVAILABLE_CREW",
        estimatedBenefit: "5.0 estimated miles",
        confidence: "Medium",
      },
    );
    expect(
      await prisma.jobAssignment.findFirst({
        where: {
          jobId: a.job.id,
          employeeId: closerEmployee.id,
          lead: true,
        },
      }),
    ).not.toBeNull();
    expect(
      await prisma.jobAssignment.findFirst({
        where: { jobId: a.job.id, employeeId: employee.id },
      }),
    ).toBeNull();
    expect(
      await prisma.auditEvent.findFirst({
        where: {
          companyId: a.company.id,
          entityId: `closer:${a.job.id}:${closerEmployee.id}`,
          eventType: "ROUTE_SUGGESTION_APPLIED",
        },
      }),
    ).not.toBeNull();
  });
});
