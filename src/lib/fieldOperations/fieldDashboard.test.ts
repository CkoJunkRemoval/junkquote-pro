import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  employeeFindFirst: vi.fn(),
  jobFindMany: vi.fn(),
  jobFindFirst: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    employee: { findFirst: mocks.employeeFindFirst },
    job: {
      findMany: mocks.jobFindMany,
      findFirst: mocks.jobFindFirst,
    },
  },
}));
vi.mock("@/lib/estimates/estimateEvents", () => ({
  recordEstimateEventInTransaction: vi.fn(),
}));
vi.mock("@/lib/jobs/updateJob", () => ({ updateJob: vi.fn() }));
vi.mock("@/lib/invoices/createInvoice", () => ({
  createInvoiceFromJob: vi.fn(),
}));

import {
  getFieldDashboard,
  resolveFieldActor,
  type FieldActor,
} from "./fieldOperations";
import type { TenantContext } from "@/lib/auth/tenant";

const context = {
  user: {
    id: "user-1",
    email: "owner@example.com",
    firstName: "Casey",
    lastName: "Owner",
    platformAdmin: false,
  },
  membership: {
    id: "membership-1",
    role: "Owner",
    status: "Active",
    billingAdmin: false,
  },
  company: { id: "company-1", name: "Company" },
  companyId: "company-1",
  role: "Owner",
} satisfies TenantContext;

const manager: FieldActor = {
  userId: "user-1",
  employeeId: "employee-1",
  displayName: "Casey Owner",
  manager: true,
};

describe("field dashboard empty states", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.employeeFindFirst.mockResolvedValue(null);
    mocks.jobFindMany.mockResolvedValue([]);
    mocks.jobFindFirst.mockResolvedValue(null);
  });

  it("allows the read-only dashboard when the company has zero employees", async () => {
    const actor = await resolveFieldActor(context, { allowUnlinked: true });
    expect(actor).toMatchObject({
      employeeId: "unlinked:user-1",
      displayName: "Casey Owner",
      manager: true,
    });
    await expect(
      getFieldDashboard(context.companyId, actor),
    ).resolves.toEqual({
      today: [],
      upcoming: [],
      overdue: [],
      completedToday: [],
      currentJob: null,
    });
  });

  it.each([
    "zero jobs",
    "zero crews",
    "zero assignments",
    "zero trucks",
  ])("returns empty dashboard collections with %s", async () => {
    await expect(
      getFieldDashboard(context.companyId, manager),
    ).resolves.toEqual({
      today: [],
      upcoming: [],
      overdue: [],
      completedToday: [],
      currentJob: null,
    });
  });

  it("keeps strict field-operation routes protected without an employee", async () => {
    await expect(resolveFieldActor(context)).rejects.toThrow(
      "An active employee profile linked to this account is required",
    );
  });

  it("logs the exact dashboard query that throws", async () => {
    const error = new Error("today query failed");
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.jobFindMany.mockRejectedValueOnce(error);

    await expect(
      getFieldDashboard(context.companyId, manager),
    ).rejects.toThrow("today query failed");
    expect(log).toHaveBeenCalledWith(
      "FIELD_QUERY_FAILED field_dashboard_today_jobs",
      error,
    );
    log.mockRestore();
  });

  it("uses assignment scoping safely for a crew member with no assignments", async () => {
    await getFieldDashboard(context.companyId, {
      ...manager,
      manager: false,
    });
    expect(mocks.jobFindMany.mock.calls[0][0].where).toMatchObject({
      companyId: context.companyId,
      assignments: { some: { OR: expect.any(Array) } },
    });
  });
});
