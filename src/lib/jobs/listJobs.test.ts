import { describe, expect, it, vi } from "vitest";

vi.mock("../prisma", () => ({ prisma: {} }));

import { buildJobListOrderBy, buildJobListWhere, normalizeJobListInput } from "./listJobs";

describe("job list query", () => {
  it("scopes results to the development company and applies a status filter", () => {
    expect(buildJobListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", normalizeJobListInput({ status: "Scheduled" }))).toMatchObject({
      companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa",
      status: "Scheduled",
    });
  });

  it("searches estimate IDs, customer names, and property addresses", () => {
    const where = buildJobListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", normalizeJobListInput({ search: "Jamie Smith" }));
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toMatchObject({ estimateId: { contains: "Jamie Smith" } });
    expect(where.OR?.[1]).toMatchObject({ customer: { AND: [{}, {}] } });
    expect(where.OR?.[2]).toMatchObject({ property: { address: { contains: "Jamie Smith" } } });
  });

  it("maps requested sort orders", () => {
    expect(buildJobListOrderBy("scheduled_asc")).toEqual([{ scheduledStart: "asc" }, { updatedAt: "desc" }]);
    expect(buildJobListOrderBy("scheduled_desc")).toEqual([{ scheduledStart: "desc" }, { updatedAt: "desc" }]);
    expect(buildJobListOrderBy("updated_asc")).toEqual({ updatedAt: "asc" });
  });

  it("bounds pagination", () => {
    expect(normalizeJobListInput({ page: 2, pageSize: 100 })).toMatchObject({ page: 2, pageSize: 50, skip: 50 });
  });
});
