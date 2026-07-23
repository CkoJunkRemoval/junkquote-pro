import { describe, expect, it } from "vitest";
import {
  estimateManagementStatusLabel,
  parseEstimateManagementStatus,
} from "./estimateListFilters";

describe("estimate list URL filters", () => {
  it("accepts KPI status routes", () => {
    expect(parseEstimateManagementStatus("Draft")).toBe("Draft");
    expect(parseEstimateManagementStatus("Approved")).toBe("Approved");
    expect(parseEstimateManagementStatus("AwaitingApproval")).toBe(
      "AwaitingApproval",
    );
  });

  it("falls back safely and labels combined lifecycle filters", () => {
    expect(parseEstimateManagementStatus("not-a-status")).toBe("All");
    expect(estimateManagementStatusLabel("AwaitingApproval")).toBe(
      "Awaiting Approval",
    );
  });
});
