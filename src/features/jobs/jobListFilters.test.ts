import { describe, expect, it } from "vitest";
import {
  parseJobManagementFilter,
  parseJobManagementPeriod,
} from "./jobListFilters";

describe("job list dashboard filters", () => {
  it("accepts operational KPI targets", () => {
    expect(parseJobManagementFilter("Scheduled")).toBe("Scheduled");
    expect(parseJobManagementFilter("InProgress")).toBe("InProgress");
    expect(parseJobManagementFilter("Completed")).toBe("Completed");
    expect(parseJobManagementPeriod("Today")).toBe("Today");
  });

  it("rejects unknown URL filters", () => {
    expect(parseJobManagementFilter("Other")).toBe("All");
    expect(parseJobManagementPeriod("AllTime")).toBeUndefined();
  });
});
