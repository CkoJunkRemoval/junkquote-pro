import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { prisma } from "@/lib/prisma";
import {
  assignAsset,
  changeAssetLifecycle,
  createAsset,
  deleteUnusedAsset,
  getAssetRemovalEligibility,
} from "@/lib/fleet/service";
import { createTenantFixtures, resetIntegrationDatabase } from "./fixtures";

describe("fleet asset lifecycle integration", () => {
  beforeEach(resetIntegrationDatabase);
  afterAll(resetIntegrationDatabase);

  it("permanently deletes only a tenant-owned unused asset and audits it", async () => {
    const { a, b } = await createTenantFixtures();
    const asset = await createAsset(a.company.id, a.user.id, {
      assetNumber: "NEW-DELETE",
      name: "Unused Dolly",
      category: "Tool",
    });
    expect(await getAssetRemovalEligibility(a.company.id, asset.id)).toMatchObject({
      canDelete: true,
      blockers: [],
    });
    await expect(
      deleteUnusedAsset(b.company.id, b.user.id, asset.id, asset.name),
    ).rejects.toThrow("Asset not found");
    await expect(
      deleteUnusedAsset(a.company.id, a.user.id, asset.id, "wrong"),
    ).rejects.toThrow("confirm permanent deletion");

    await deleteUnusedAsset(a.company.id, a.user.id, asset.id, asset.name);

    expect(await prisma.fleetAsset.findUnique({ where: { id: asset.id } })).toBeNull();
    expect(
      await prisma.auditEvent.findFirst({
        where: {
          companyId: a.company.id,
          entityId: asset.id,
          eventType: "fleet.asset_deleted",
        },
      }),
    ).toBeTruthy();
  });

  it("blocks deletion when history exists", async () => {
    const { a } = await createTenantFixtures();
    const asset = await createAsset(a.company.id, a.user.id, {
      assetNumber: "HISTORY-1",
      name: "Historical Cart",
      category: "Tool",
    });
    await prisma.assetMileageEntry.create({
      data: {
        companyId: a.company.id,
        assetId: asset.id,
        odometerMiles: 12,
        recordedAt: new Date(),
        source: "Manual",
        createdById: a.user.id,
      },
    });

    const eligibility = await getAssetRemovalEligibility(a.company.id, asset.id);
    expect(eligibility.canDelete).toBe(false);
    expect(eligibility.blockers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "mileageEntries", count: 1 }),
      ]),
    );
    await expect(
      deleteUnusedAsset(a.company.id, a.user.id, asset.id, asset.name),
    ).rejects.toThrow("mileage entries");
    expect(await prisma.fleetAsset.findUnique({ where: { id: asset.id } })).toBeTruthy();
  });

  it("retires with a reason, closes assignments, and supports controlled reactivation", async () => {
    const { a } = await createTenantFixtures();
    const asset = await createAsset(a.company.id, a.user.id, {
      assetNumber: "LIFECYCLE-1",
      name: "Lifecycle Tool",
      category: "Tool",
    });
    const assignment = await assignAsset(a.company.id, a.user.id, {
      assetId: asset.id,
      assigneeType: "Employee",
      employeeId: a.employee.id,
      startingCondition: "Good",
    });
    await expect(
      changeAssetLifecycle(a.company.id, a.user.id, asset.id, "Retired", ""),
    ).rejects.toThrow("reason");

    await changeAssetLifecycle(
      a.company.id,
      a.user.id,
      asset.id,
      "Retired",
      "Reached end of service life",
    );

    expect(await prisma.fleetAsset.findUnique({ where: { id: asset.id } })).toMatchObject({
      status: "Retired",
      assignedEmployeeId: null,
    });
    expect(await prisma.assetAssignment.findUnique({ where: { id: assignment.id } })).toMatchObject({
      returnedById: a.user.id,
    });
    await expect(
      assignAsset(a.company.id, a.user.id, {
        assetId: asset.id,
        assigneeType: "Employee",
        employeeId: a.employee.id,
        startingCondition: "Good",
      }),
    ).rejects.toThrow("cannot be assigned");

    await changeAssetLifecycle(
      a.company.id,
      a.user.id,
      asset.id,
      "Available",
      "Returned to safe operating condition",
    );
    expect(await prisma.fleetAsset.findUnique({ where: { id: asset.id } })).toMatchObject({
      status: "Available",
    });
    expect(
      await prisma.auditEvent.count({
        where: {
          companyId: a.company.id,
          entityId: asset.id,
          eventType: { in: ["fleet.asset_retired", "fleet.asset_reactivated"] },
        },
      }),
    ).toBe(2);
  });
});
