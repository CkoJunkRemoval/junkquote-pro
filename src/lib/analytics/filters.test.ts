import { describe, expect, it } from "vitest";
import { filtersToQuery, parseAnalyticsFilters } from "./filters";
describe("analytics filters", () => {
  it("defaults to a safe 30-day window", () => {
    const f = parseAnalyticsFilters({}, new Date("2026-07-18T12:00:00Z"));
    expect(f.from.toISOString().slice(0, 10)).toBe("2026-06-19");
    expect(f.to.toISOString().slice(0, 10)).toBe("2026-07-18");
  });
  it("parses and persists combinations", () => {
    const f = parseAnalyticsFilters({
      from: "2026-01-01",
      to: "2026-03-31",
      crew: "c",
      recurring: "1",
      completed: "1",
    });
    const q = filtersToQuery(f);
    expect(q).toContain("crew=c");
    expect(q).toContain("recurring=1");
    expect(q).toContain("completed=1");
  });
  it("repairs an inverted range", () => {
    const f = parseAnalyticsFilters({ from: "2026-08-01", to: "2026-07-01" });
    expect(f.from <= f.to).toBe(true);
  });
});
