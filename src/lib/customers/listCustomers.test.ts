import { describe, expect, it, vi } from "vitest";

vi.mock("../prisma", () => ({ prisma: {} }));

import {
  buildCustomerListOrderBy,
  buildCustomerListWhere,
  normalizeCustomerListInput,
} from "./listCustomers";

describe("customer list query", () => {
  it("scopes every result to the development company", () => {
    expect(buildCustomerListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", normalizeCustomerListInput({}))).toMatchObject({
      companyId: "8306c54b-befc-4f2a-aa2e-42a63d0eccaa",
    });
  });

  it("searches customer names, phone, and email", () => {
    const where = buildCustomerListWhere("8306c54b-befc-4f2a-aa2e-42a63d0eccaa", normalizeCustomerListInput({ search: "Jamie Smith" }));
    expect(where.OR).toHaveLength(3);
    expect(where.OR?.[0]).toMatchObject({ AND: [{}, {}] });
    expect(where.OR?.[1]).toMatchObject({ phone: { contains: "Jamie Smith" } });
    expect(where.OR?.[2]).toMatchObject({ email: { contains: "Jamie Smith" } });
  });

  it("maps all supported sorting options", () => {
    expect(buildCustomerListOrderBy("name_asc")).toEqual([{ firstName: "asc" }, { lastName: "asc" }]);
    expect(buildCustomerListOrderBy("name_desc")).toEqual([{ firstName: "desc" }, { lastName: "desc" }]);
    expect(buildCustomerListOrderBy("estimate_count_desc")).toEqual({ estimates: { _count: "desc" } });
  });

  it("bounds pagination", () => {
    expect(normalizeCustomerListInput({ page: 3, pageSize: 100 })).toMatchObject({ page: 3, pageSize: 50, skip: 100 });
  });
});
