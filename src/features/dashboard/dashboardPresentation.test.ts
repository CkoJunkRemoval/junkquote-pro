import { describe, expect, it } from "vitest";
import { dashboardPerformanceContent } from "./dashboardPresentation";

const empty = {
  sampleSize: 0,
  decisionCount: 0,
  averageEstimateAccuracy: 0,
  acceptanceRate: 0,
  averageDiscount: 0,
  revenueVsQuoted: { quoted: 0, collected: 0 },
  mostProfitableItems: [],
};

describe("dashboard performance presentation", () => {
  it("uses explanatory empty states when analytics have no sample", () => {
    expect(dashboardPerformanceContent(empty)).toEqual({
      estimateAccuracy: "No completed estimates yet",
      suggestionAcceptance: "No pricing suggestions reviewed yet",
      averageDiscount: "No completed estimates yet",
      revenueVsQuoted: "No completed revenue data yet",
      mostProfitableItems: "Complete jobs to populate analytics",
    });
  });

  it("preserves meaningful measured zero values", () => {
    expect(
      dashboardPerformanceContent({
        ...empty,
        sampleSize: 2,
        decisionCount: 1,
      }),
    ).toMatchObject({
      estimateAccuracy: "0.0%",
      suggestionAcceptance: "0.0%",
      averageDiscount: "$0.00",
      revenueVsQuoted: "$0 / $0",
    });
  });
});
