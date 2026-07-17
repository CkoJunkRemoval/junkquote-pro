import { describe, expect, it } from "vitest";
import { canTransitionJobStatus } from "./statusWorkflow";

describe("job status workflow", () => {
  it("allows the defined forward transitions", () => {
    expect(canTransitionJobStatus("Unscheduled", "Scheduled")).toBe(true);
    expect(canTransitionJobStatus("Scheduled", "InProgress")).toBe(true);
    expect(canTransitionJobStatus("InProgress", "Completed")).toBe(true);
  });

  it("blocks invalid and terminal transitions", () => {
    expect(canTransitionJobStatus("Unscheduled", "Completed")).toBe(false);
    expect(canTransitionJobStatus("Completed", "Cancelled")).toBe(false);
    expect(canTransitionJobStatus("Cancelled", "Scheduled")).toBe(false);
  });
});
