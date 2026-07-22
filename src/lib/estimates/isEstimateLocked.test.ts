import { describe, expect, it } from "vitest";
import { isEstimateLocked } from "./isEstimateLocked";

describe("estimate lifecycle lock", () => {
  for (const status of ["Draft", "Sent", "Viewed", "Declined", "Expired"]) {
    it(`${status.toLowerCase()} estimates are editable`, () => {
      expect(isEstimateLocked({ status, signedAt: null })).toBe(false);
    });
  }

  it("approved estimates are read-only", () => {
    expect(isEstimateLocked({ status: "Approved", signedAt: null })).toBe(true);
  });

  it("an approval timestamp remains authoritative after later workflow transitions", () => {
    expect(isEstimateLocked({ status: "Scheduled", signedAt: new Date() })).toBe(true);
  });

  it("delivery metadata does not affect the lock rule", () => {
    expect(isEstimateLocked({ status: "Sent", signedAt: null, approvalToken: "token", sentAt: new Date() } as never)).toBe(false);
  });
});
