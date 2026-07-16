import { describe, expect, it } from "vitest";

import { canTransitionEstimateStatus } from "./statusWorkflow";

describe("estimate status workflow", () => {
  it("allows only the configured forward transitions", () => {
    expect(canTransitionEstimateStatus("Draft", "Ready")).toBe(true);
    expect(canTransitionEstimateStatus("Sent", "Approved")).toBe(true);
    expect(canTransitionEstimateStatus("Sent", "Declined")).toBe(true);
    expect(canTransitionEstimateStatus("Completed", "Archived")).toBe(true);
  });

  it("rejects skipped and terminal-state transitions", () => {
    expect(canTransitionEstimateStatus("Draft", "Sent")).toBe(false);
    expect(canTransitionEstimateStatus("Declined", "Scheduled")).toBe(false);
    expect(canTransitionEstimateStatus("Archived", "Ready")).toBe(false);
  });
});
