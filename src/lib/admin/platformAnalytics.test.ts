import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
import { calculateConversionMetrics, csv, platformRange } from "./platformAnalytics";

describe("platform analytics contracts", () => {
  it("uses sent estimates as the approval-rate denominator", () => {
    const result = calculateConversionMetrics([
      { status: "Draft", sentAt: null, signedAt: null, job: null },
      { status: "Sent", sentAt: new Date("2026-01-01"), signedAt: null, job: null },
      { status: "Approved", sentAt: new Date("2026-01-01"), signedAt: new Date("2026-01-02"), job: { id: "job" } },
    ], [{ status: "Sent", payments: [] }, { status: "Paid", payments: [{ id: "payment" }] }]);
    expect(result.approvalRate).toBe(50);
    expect(result.estimateToJobRate).toBe(33.3);
    expect(result.invoiceToPaymentRate).toBe(50);
    expect(result.medianSentToApprovedHours).toBe(24);
  });
  it("returns zero rates for empty data", () => {
    const result = calculateConversionMetrics([], []);
    expect(result.approvalRate).toBe(0);
    expect(result.medianSentToApprovedHours).toBeNull();
  });
  it("builds bounded date periods", () => {
    const now = new Date("2026-07-27T12:00:00Z");
    expect(platformRange("7d", undefined, undefined, now).from?.toISOString()).toBe("2026-07-20T12:00:00.000Z");
    expect(platformRange("month", undefined, undefined, now).from?.getDate()).toBe(1);
  });
  it("escapes spreadsheet-safe deterministic CSV columns", () => {
    expect(csv([{ company: 'A, "Co"', note: "=SUM(A1)" }])).toBe('"company","note"\r\n"A, ""Co""","\'=SUM(A1)"\r\n');
  });
});
