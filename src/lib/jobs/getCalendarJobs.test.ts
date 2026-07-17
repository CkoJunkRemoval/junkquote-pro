import { describe, expect, it, vi } from "vitest";

vi.mock("../prisma", () => ({ prisma: {} }));

import { buildCalendarJobWhere } from "./getCalendarJobs";

describe("calendar job query", () => {
  const start = new Date("2026-07-01T00:00:00.000Z");
  const end = new Date("2026-08-01T00:00:00.000Z");

  it("limits calendar loading to the visible date range and development company", () => {
    expect(buildCalendarJobWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", { start, end })).toMatchObject({
      companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa",
      scheduledStart: { gte: start, lt: end },
      status: { in: ["Scheduled", "InProgress"] },
    });
  });

  it("honors calendar status and customer/property search filters", () => {
    const where = buildCalendarJobWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", { start, end, statuses: ["Completed"], search: "Jamie Smith" });
    expect(where.status).toEqual({ in: ["Completed"] });
    expect(where.OR).toHaveLength(2);
    expect(where.OR?.[0]).toMatchObject({ customer: { AND: [{}, {}] } });
    expect(where.OR?.[1]).toMatchObject({ property: { address: { contains: "Jamie Smith" } } });
  });
});
