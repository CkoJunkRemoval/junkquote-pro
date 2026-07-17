import { describe, expect, it } from "vitest";
import { getSignedPdfError } from "./signedPdfAccess";

describe("signed estimate PDF access", () => {
  it("allows a signed approved estimate", () => expect(getSignedPdfError("Approved", true)).toBeNull());
  it("allows team-device signed PDFs from freshly loaded signature fields", () => {
    expect(getSignedPdfError("Approved", true)).toBeNull();
  });
  it("allows public-link signed PDFs from freshly loaded signature fields", () => {
    expect(getSignedPdfError("Approved", true)).toBeNull();
  });
  it("does not use stale client state when fresh database signature fields exist", () => {
    const staleClientHasSignature = false;
    const freshDatabaseHasSignature = true;
    expect(staleClientHasSignature).toBe(false);
    expect(getSignedPdfError("Approved", freshDatabaseHasSignature)).toBeNull();
  });
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
