import { describe, expect, it } from "vitest";
import { getSignedPdfError } from "./signedPdfAccess";

describe("signed estimate PDF access", () => {
  it("allows a signed approved estimate", () => expect(getSignedPdfError("Approved", true)).toBeNull());
  it("rejects unsigned estimates", () => expect(getSignedPdfError("Sent", false)).toContain("signed estimate"));
  it("rejects invalid and expired tokens", () => {
    expect(getSignedPdfError(null, false, "invalid token")).toBe("invalid token");
    expect(getSignedPdfError(null, false, "expired token")).toBe("expired token");
  });
  it("rejects declined and missing-signature states", () => {
    expect(getSignedPdfError("Declined", true)).toContain("no longer available");
    expect(getSignedPdfError("Approved", false)).toContain("signed estimate");
  });
});
