import { describe, expect, it } from "vitest";
import {
  renderAnalyticsCsv,
  renderAnalyticsExcel,
  renderAnalyticsPdf,
} from "./export";
const rows: Array<[string, string | number]> = [
  ["Metric", "quoted, value"],
  ["Revenue", 125],
];
describe("analytics exports", () => {
  it("escapes CSV", () =>
    expect(renderAnalyticsCsv(rows)).toContain('"quoted, value"'));
  it("creates Excel-compatible XML", () =>
    expect(renderAnalyticsExcel(rows)).toContain("<Workbook"));
  it("creates a PDF buffer", () =>
    expect(
      renderAnalyticsPdf(rows, "Executive").subarray(0, 4).toString(),
    ).toBe("%PDF"));
});
