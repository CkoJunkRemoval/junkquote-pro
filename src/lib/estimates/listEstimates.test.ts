import { describe, expect, it, vi } from "vitest";

vi.mock("../prisma", () => ({ prisma: {} }));
import {
  buildEstimateListOrderBy,
  buildEstimateListWhere,
  normalizeEstimateListInput,
} from "./listEstimates";

describe("estimate list query input", () => {
  it("uses bounded pagination", () => expect(normalizeEstimateListInput({ page: 2, pageSize: 100 })).toMatchObject({ page: 2, pageSize: 50, skip: 50 }));
  it("keeps a requested status filter", () => expect(normalizeEstimateListInput({ status: "Draft" }).status).toBe("Draft"));
  it("always scopes requests to the development company", () => {
    const where = buildEstimateListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", normalizeEstimateListInput({ status: "Draft" }));
    expect(where).toMatchObject({
      companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa",
      status: "Draft",
    });
  });
  it("normalizes search and applies every customer-name term", () => {
    const query = normalizeEstimateListInput({ search: "  Jane Smith  " });
    expect(query.search).toBe("Jane Smith");
    expect(buildEstimateListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", query).OR?.[1]).toMatchObject({
      customer: { AND: [{}, {}] },
    });
  });
  it("maps requested sorting to the server query", () => {
    expect(buildEstimateListOrderBy("updated_asc")).toEqual({ updatedAt: "asc" });
    expect(buildEstimateListOrderBy("total_desc")).toEqual({ pricingTotal: "desc" });
    expect(buildEstimateListOrderBy("total_asc")).toEqual({ pricingTotal: "asc" });
  });
  it("does not accept an unbounded page size", () => expect(normalizeEstimateListInput({ pageSize: 0 }).pageSize).toBe(1));
});
