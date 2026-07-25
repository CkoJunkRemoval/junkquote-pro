import { describe, expect, it } from "vitest";
import { taxDocumentKey } from "./taxDocumentStorage";

describe("tax document privacy", () => {
  it("creates tenant-scoped private keys and rejects traversal", () => {
    expect(taxDocumentKey("company-1", "doc-1", "return.pdf")).toBe("tax-documents/company-1/doc-1/return.pdf");
    expect(() => taxDocumentKey("company-1", "doc-1", "../return.pdf")).toThrow();
  });
});
