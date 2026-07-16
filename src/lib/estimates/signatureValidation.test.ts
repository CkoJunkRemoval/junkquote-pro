import { describe, expect, it } from "vitest";
import { canSaveSignature, validateSignature } from "./signatureValidation";

const signature = "data:image/png;base64,aGVsbG8=";

describe("estimate signature validation", () => {
  it("rejects a missing signer name", () => expect(() => validateSignature("", signature)).toThrow("name"));
  it("rejects a missing signature", () => expect(() => validateSignature("Ada Lovelace", "")).toThrow("signature"));
  it("accepts a valid public or team-device signature payload", () => {
    expect(() => validateSignature("Ada Lovelace", signature)).not.toThrow();
  });
  it("allows successful public and team-device signing states", () => {
    expect(canSaveSignature("Sent", null, "PublicLink")).toBe(true);
    expect(canSaveSignature("Ready", null, "TeamDevice")).toBe(true);
  });
  it("rejects duplicate signing", () => {
    expect(canSaveSignature("Sent", signature, "PublicLink")).toBe(false);
  });
  it("rejects malformed signature data", () => expect(() => validateSignature("Ada Lovelace", "not-a-signature")).toThrow("invalid"));
});
