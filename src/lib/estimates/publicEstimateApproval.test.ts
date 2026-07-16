import { describe, expect, it } from "vitest";

import { getPublicApprovalError } from "./publicEstimateApproval";

const now = new Date("2026-07-16T12:00:00.000Z");
const future = new Date("2026-07-17T12:00:00.000Z");
const past = new Date("2026-07-15T12:00:00.000Z");

describe("public estimate approval token validation", () => {
  it("accepts a valid sent token", () => {
    expect(getPublicApprovalError("Sent", future, now)).toBeNull();
  });

  it("rejects an invalid token", () => {
    expect(getPublicApprovalError(null, null, now)).toContain("invalid or has expired");
  });

  it("rejects an expired token", () => {
    expect(getPublicApprovalError("Sent", past, now)).toContain("invalid or has expired");
  });

  it("permits an approved token to show its completed response", () => {
    expect(getPublicApprovalError("Approved", future, now)).toBeNull();
  });

  it("rejects a declined token", () => {
    expect(getPublicApprovalError("Declined", future, now)).toContain("no longer available");
  });
});
